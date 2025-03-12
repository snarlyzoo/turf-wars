import { Flamework, OnStart, Service } from "@flamework/core";
import Object from "@rbxts/object-utils";
import { Players, RunService, ServerStorage, Teams, Workspace } from "@rbxts/services";
import { Events } from "server/network";
import { PlayerRegistry, PlayerStatsManager } from "server/services/players";
import { BlockGrid } from "shared/modules";
import { GameState } from "shared/types";
import { CharacterType } from "shared/types/characterTypes";
import { ChampionStage, GameMap, TeamSpawn } from "shared/types/workspaceTypes";
import { fisherYatesShuffle } from "shared/utility";
import { TurfService } from ".";

type Phase = {
	Type: PhaseType;
	Duration: number;

	TurfPerKill?: number;

	initialBlockCount?: number;
	initialProjectileCount?: number;
};
enum PhaseType {
	Build = "Build",
	Combat = "Combat",
}

const isGameMap = Flamework.createGuard<GameMap>();

@Service()
export class RoundManager implements OnStart {
	private readonly MIN_PLAYER_COUNT: number = 2;

	private readonly INTERMISSION_TIME: number = 60;
	private readonly ROUND_START_COUNTDOWN: number = 10;
	private readonly CHAMPION_DISPLAY_TIME: number = 15;

	private readonly PHASE_SEQUENCE: Phase[] = [
		{ Type: PhaseType.Build, Duration: 40, initialBlockCount: 32 },
		{ Type: PhaseType.Combat, Duration: 90, initialProjectileCount: 16 },
		{ Type: PhaseType.Build, Duration: 20, initialBlockCount: 16 },
		{ Type: PhaseType.Combat, Duration: 90, TurfPerKill: 3, initialProjectileCount: 16 },
	];

	private readonly SPECTATOR_TEAM: Team = Teams.FindFirstChild("Spectators") as Team;

	private readonly GAME_MAP_PREFAB: GameMap;
	private readonly MAP_LOAD_TIMEOUT: number = 10;

	public get state(): GameState {
		return this._state;
	}
	private set state(value: GameState) {
		this._state = value;
	}
	private _state: GameState = GameState.WaitingForPlayers;

	private phaseIndex: number = 0;
	private cancelTimer?: () => boolean;

	private players: Set<Player> = new Set();

	private team1: Team = Teams.FindFirstChild("Blue Team") as Team;
	private team2: Team = Teams.FindFirstChild("Red Team") as Team;

	private gameMap!: GameMap;

	public constructor(
		private playerRegistry: PlayerRegistry,
		private playerStatsManager: PlayerStatsManager,
		private turfService: TurfService,
	) {
		const map = ServerStorage.FindFirstChild("GameMap");
		if (!map || !isGameMap(map)) error("No valid map found in server storage");
		this.GAME_MAP_PREFAB = map;

		if (RunService.IsStudio()) {
			this.MIN_PLAYER_COUNT = 1;
			this.INTERMISSION_TIME = 2;
			this.ROUND_START_COUNTDOWN = 2;
			this.CHAMPION_DISPLAY_TIME = 2;
			this.PHASE_SEQUENCE = [
				{ Type: PhaseType.Build, Duration: 2, initialBlockCount: 32 },
				//{ Type: PhaseType.Combat, Duration: 60, initialProjectileCount: 16 },
			];
		}
	}

	public onStart(): void {
		Players.PlayerAdded.Connect(() => this.onPlayerAdded());
		Players.PlayerRemoving.Connect((player) => this.onPlayerRemoving(player));
	}

	private startIntermission(): void {
		this.changeState(GameState.Intermission);
		Events.IntermissionStarting.broadcast();
		Events.SetGameClock.broadcast(this.INTERMISSION_TIME, "Intermission");
		this.promiseTimer(this.INTERMISSION_TIME)
			.andThen(() => this.startRound())
			.catch((err) => warn(err));
	}

	private async startRound(): Promise<void> {
		if (this.state !== GameState.Intermission) return;

		this.changeState(GameState.Round);

		print("Loading game map...");

		const gameMap = await this.loadGameMap().catch((err) => {
			warn(`Failed to load game map: ${err}`);
			this.changeState(GameState.WaitingForPlayers);
			this.checkPlayerCount();
			return;
		});
		if (!gameMap) return;
		this.gameMap = gameMap;

		print("Game map loaded");

		this.turfService.initialize(this.team1, this.team2, this.gameMap);

		Players.GetPlayers().forEach((player) => {
			this.players.add(player);
			this.playerStatsManager.initializePlayer(player);
		});
		this.shuffleTeams();
		await this.setPlayerComponents(CharacterType.Game);

		Events.RoundStarting.broadcast(this.team1, this.team2, this.gameMap);
		Events.SetGameClock.broadcast(this.ROUND_START_COUNTDOWN, "Round Starting");

		await Promise.delay(this.ROUND_START_COUNTDOWN);

		this.disableSpawnBarriers(this.gameMap.Team1Spawn);
		this.disableSpawnBarriers(this.gameMap.Team2Spawn);

		this.runPhase(0);
	}

	private runPhase(index: number): void {
		if (this.state !== GameState.Round) return;

		if (index >= this.PHASE_SEQUENCE.size()) {
			this.endRound();
			return;
		}

		this.phaseIndex = index;
		const phase = this.PHASE_SEQUENCE[this.phaseIndex];

		const combatEnabled = phase.Type === PhaseType.Combat;
		if (combatEnabled) {
			this.turfService.setTurfPerKill(phase.TurfPerKill ?? 1);
		}
		this.playerRegistry.setCombatEnabled(combatEnabled);

		if (phase.initialBlockCount !== undefined) this.playerRegistry.giveBlocksToAll(phase.initialBlockCount);
		if (phase.initialProjectileCount !== undefined)
			this.playerRegistry.giveProjectilesToAll(phase.initialProjectileCount);

		Events.SetGameClock.broadcast(phase.Duration, `${phase.Type} Phase`);

		print(`Starting ${phase.Type} phase ${index + 1}`);

		this.promiseTimer(phase.Duration)
			.andThen(() => this.runPhase(index + 1))
			.catch((err) => warn(err));
	}

	private async endRound(): Promise<void> {
		if (this.state !== GameState.Round) return;

		this.changeState(GameState.PostRound);

		const winningTeam = this.turfService.getWinningTeam() ?? this.team1;
		print(`Round over, ${winningTeam.Name} wins!`);

		await this.setPlayerComponents(CharacterType.None);

		const [championData, championStage] = this.displayChampions(winningTeam);
		Events.RoundEnding.broadcast(winningTeam, championData, championStage);
		await Promise.delay(this.CHAMPION_DISPLAY_TIME);

		this.players.forEach((player) => (player.Team = this.SPECTATOR_TEAM));
		await this.setPlayerComponents(CharacterType.Lobby);
		this.players.clear();
		this.playerStatsManager.clearAllStats();

		this.gameMap.Destroy();

		this.checkPlayerCount();
	}

	private changeState(newState: GameState): void {
		if (this.state === newState) return;

		if (this.cancelTimer) {
			this.cancelTimer();
			this.cancelTimer = undefined;
		}

		print(`Changing state to ${newState}`);

		if (newState === GameState.WaitingForPlayers) Events.WaitingForPlayers.broadcast();

		this.state = newState;
	}

	private isMapReady(map: GameMap): boolean {
		return (
			map.TurfLines !== undefined &&
			map.TurfLines.GetChildren().size() >= BlockGrid.DIMENSIONS.X &&
			map.Team1Spawn !== undefined &&
			map.Team2Spawn !== undefined &&
			map.Team1Spawn.SpawnBarriers !== undefined &&
			map.Team1Spawn.SpawnLocations !== undefined &&
			map.Team2Spawn.SpawnBarriers !== undefined &&
			map.Team2Spawn.SpawnLocations !== undefined
		);
	}

	private async loadGameMap(): Promise<GameMap> {
		return new Promise((resolve, reject) => {
			const map = this.GAME_MAP_PREFAB.Clone();
			map.Parent = Workspace;

			print(map.Parent);

			const start = os.clock();
			while (os.clock() - start < this.MAP_LOAD_TIMEOUT) {
				if (this.isMapReady(map)) {
					resolve(map);
					return;
				}
				task.wait(0.1);
			}

			map.Destroy();
			reject("Map load timeout");
		});
	}

	private disableSpawnBarriers(teamSpawn: TeamSpawn): void {
		teamSpawn.SpawnBarriers.GetChildren()
			.filter((child) => child.IsA("BasePart"))
			.forEach((barrier) => {
				barrier.Transparency = 0.8;
				barrier.CanCollide = false;
			});
	}

	private displayChampions(winningTeam: Team): [Array<[string, string, string]>, ChampionStage] {
		const championStage = this.gameMap[winningTeam === this.team1 ? "Team1Spawn" : "Team2Spawn"].ChampionStage;
		const positions = [
			championStage.Positions.First,
			championStage.Positions.Second,
			championStage.Positions.Third,
			championStage.Positions.Fourth,
			championStage.Positions.Fifth,
		];

		const champions = this.playerStatsManager.getChampions();
		const championData: Array<[string, string, string]> = [];
		Object.entries(champions).forEach(([award, [player, message]], i) => {
			const character = player.Character;
			if (!character) {
				warn(`Player ${player.Name} does not have a character`);
				return;
			}

			const rootPart = character.PrimaryPart;
			const humanoid = character.FindFirstChildOfClass("Humanoid");
			if (!rootPart || !humanoid) {
				warn(`Character for ${player.Name} is missing parts`);
				return;
			}
			const yOffset =
				humanoid.RigType === Enum.HumanoidRigType.R15 ? humanoid.HipHeight + rootPart.Size.Y / 2 : 3;
			character.PivotTo(positions[i].GetPivot().add(new Vector3(0, yOffset, 0)));
			rootPart.Anchored = true;

			print(`${player.Name} wins the ${award} award: ${message}`);

			for (let i = 0; i < 5; i++) championData.push([player.Name, award, message]);
		});

		return [championData, championStage];
	}

	private async setPlayerComponents(characterType: CharacterType): Promise<void> {
		await Promise.all(
			[...this.players].map((player) => this.playerRegistry.setPlayerComponent(player, characterType)),
		);
	}

	private shuffleTeams(): void {
		let index = 0;
		fisherYatesShuffle([...this.players]).forEach((player) => {
			player.Team = index % 2 === 0 ? this.team1 : this.team2;
			index++;
		});
	}

	private removePlayerFromRound(player: Player): void {
		this.players.delete(player);
		if (this.players.size() < this.MIN_PLAYER_COUNT) this.endRound();
	}

	private checkPlayerCount(): void {
		if (Players.GetPlayers().size() >= this.MIN_PLAYER_COUNT) {
			if (this.state === GameState.WaitingForPlayers || this.state === GameState.PostRound) {
				this.startIntermission();
			}
		} else if (this.state !== GameState.WaitingForPlayers) {
			this.changeState(GameState.WaitingForPlayers);
		}
	}

	private promiseTimer(duration: number): Promise<void> {
		let cancelled = false;
		const promise = new Promise<void>((resolve, reject) =>
			task.spawn(() => {
				const begin = os.clock();
				while (os.clock() - begin < duration) {
					if (cancelled) {
						reject(`Timer cancelled after ${math.floor(os.clock() - begin)} seconds`);
						return;
					}
					task.wait();
				}
				resolve();
			}),
		);

		this.cancelTimer = (): boolean => (cancelled = true);

		return promise;
	}

	private onPlayerAdded(): void {
		if (this.state === GameState.WaitingForPlayers) this.checkPlayerCount();
	}
	private onPlayerRemoving(player: Player): void {
		if (this.state === GameState.Round) {
			this.removePlayerFromRound(player);
		} else {
			this.checkPlayerCount();
		}
	}
}
