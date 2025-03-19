import { Flamework, OnStart, Service } from "@flamework/core";
import Object from "@rbxts/object-utils";
import { Players, RunService, ServerStorage, Teams, Workspace } from "@rbxts/services";
import { Events } from "server/network";
import { PlayerRegistry, PlayerStatsManager } from "server/services/players";
import { BlockGrid } from "shared/modules";
import {
	GameStateType,
	gameStateAtom,
	setGameStateType,
	startIntermissionTimer,
	startWaitingForPlayersTimer,
} from "shared/state/GameState";
import {
	clearRoundState,
	getRoundState,
	initRoundState,
	PhaseType,
	setCombatEnabled,
	setPhase,
} from "shared/state/RoundState";
import { CharacterType } from "shared/types/characterTypes";
import { ChampionStage, GameMap, TeamSpawn } from "shared/types/workspaceTypes";
import { fisherYatesShuffle } from "shared/utility";
import { TurfService } from ".";

type Phase = {
	Type: PhaseType;
	Duration: number;

	turfPerKill?: number;

	blockCount?: number;
	projectileCount?: number;
};

const isGameMap = Flamework.createGuard<GameMap>();

@Service()
export class RoundManager implements OnStart {
	private readonly MIN_PLAYER_COUNT: number = 2;

	private readonly INTERMISSION_TIME: number = 30;
	private readonly ROUND_START_COUNTDOWN: number = 10;
	private readonly CHAMPION_DISPLAY_TIME: number = 15;

	private readonly PHASE_SEQUENCE: Phase[] = [
		{ Type: PhaseType.Build, Duration: 40, blockCount: 32 },
		{ Type: PhaseType.Combat, Duration: 90, projectileCount: 16 },
		{ Type: PhaseType.Build, Duration: 20, blockCount: 16 },
		{ Type: PhaseType.Combat, Duration: 90, turfPerKill: 3, projectileCount: 8 },
	];

	private readonly SPECTATOR_TEAM: Team = Teams.FindFirstChild("Spectators") as Team;

	private readonly GAME_MAP_PREFAB: GameMap;
	private readonly MAP_LOAD_TIMEOUT: number = 10;

	private phaseIndex: number = 0;
	private cancelTimer?: () => boolean;

	private players: Set<Player> = new Set();

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
				{ Type: PhaseType.Build, Duration: 2, blockCount: 32 },
				{ Type: PhaseType.Combat, Duration: 15, projectileCount: 16 },
			];
		}
	}

	public onStart(): void {
		Players.PlayerAdded.Connect(() => this.onPlayerAdded());
		Players.PlayerRemoving.Connect((player) => this.onPlayerRemoving(player));
		startWaitingForPlayersTimer();
	}

	private startIntermission(): void {
		this.changeGameState(GameStateType.Intermission);
		this.promiseTimer(this.INTERMISSION_TIME)
			.andThen(() => this.startRound())
			.catch((err) => warn(err));
	}

	private async startRound(): Promise<void> {
		this.changeGameState(GameStateType.Round);

		print("Loading game map...");

		let gameMap;
		try {
			gameMap = await this.loadGameMap();
		} catch (err) {
			warn(`Failed to load game map: ${err}`);
			this.changeGameState(GameStateType.WaitingForPlayers);
			this.checkPlayerCount();
			return;
		}

		print("Game map loaded");

		const [team1, team2] = [Teams.FindFirstChild("Blue Team") as Team, Teams.FindFirstChild("Red Team") as Team]; // TODO: Support more than 2 teams
		initRoundState(team1, team2, gameMap);

		this.turfService.reset();

		/**
		Players.GetPlayers().forEach((player) => {
			this.players.add(player);
			this.playerStatsManager.initializePlayer(player);
		});
		this.shuffleTeams(team1, team2);
		this.setPlayerComponents(CharacterType.Game);
		*/

		setPhase(PhaseType.RoundStart, this.ROUND_START_COUNTDOWN);
		await Promise.delay(this.ROUND_START_COUNTDOWN);

		this.disableSpawnBarriers(gameMap.Team1Spawn);
		this.disableSpawnBarriers(gameMap.Team2Spawn);

		this.runPhase(0);
	}

	private runPhase(index: number): void {
		if (index >= this.PHASE_SEQUENCE.size()) {
			this.endRound();
			return;
		}

		const phase = this.PHASE_SEQUENCE[index];

		print(`Starting ${phase.Type} phase ${index + 1}`);

		setCombatEnabled(phase.Type === PhaseType.Combat, phase.turfPerKill);

		if (phase.blockCount !== undefined) this.playerRegistry.giveBlocksToAll(phase.blockCount);
		if (phase.projectileCount !== undefined) this.playerRegistry.giveProjectilesToAll(phase.projectileCount);

		setPhase(phase.Type, phase.Duration);
		this.phaseIndex = index;

		this.promiseTimer(phase.Duration)
			.andThen(() => this.runPhase(index + 1))
			.catch((err) => warn(err));
	}

	private async endRound(): Promise<void> {
		this.changeGameState(GameStateType.PostRound);

		const roundState = getRoundState();
		if (roundState) {
			const gameMap = roundState.gameMap as GameMap;

			let winningTeam, championStage;
			if (roundState.team1Turf >= BlockGrid.DIMENSIONS.X / 2) {
				winningTeam = roundState.team1;
				championStage = gameMap.Team1Spawn.ChampionStage;
			} else {
				winningTeam = roundState.team2;
				championStage = gameMap.Team2Spawn.ChampionStage;
			}

			print(`Round over, ${winningTeam.Name} wins!`);

			await this.setPlayerComponents(CharacterType.None);

			const championData = this.displayChampions(championStage);
			Events.RoundEnded.broadcast(winningTeam, championData);
			await Promise.delay(this.CHAMPION_DISPLAY_TIME);

			gameMap.Destroy();

			clearRoundState();
		}

		this.players.forEach((player) => (player.Team = this.SPECTATOR_TEAM));
		this.setPlayerComponents(CharacterType.Lobby);
		this.players.clear();
		this.playerStatsManager.clearAllStats();

		this.checkPlayerCount();
	}

	private changeGameState(stateType: GameStateType): void {
		if (this.cancelTimer) {
			this.cancelTimer();
			this.cancelTimer = undefined;
		}

		print(`Changing state to ${stateType}`);

		switch (stateType) {
			case GameStateType.WaitingForPlayers:
				startWaitingForPlayersTimer();
				break;
			case GameStateType.Intermission:
				startIntermissionTimer(this.INTERMISSION_TIME);
				break;
			default:
				setGameStateType(stateType);
		}
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

	private displayChampions(championStage: ChampionStage): Array<[string, string, string]> {
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

			championData.push([player.Name, award, message]);
		});
		return championData;
	}

	private async setPlayerComponents(characterType: CharacterType): Promise<void> {
		await Promise.all(
			[...this.players].map((player) => this.playerRegistry.setPlayerComponent(player, characterType)),
		);
	}

	private shuffleTeams(team1: Team, team2: Team): void {
		let index = 0;
		fisherYatesShuffle([...this.players]).forEach((player) => {
			player.Team = index % 2 === 0 ? team1 : team2;
			index++;
		});
	}

	private removePlayerFromRound(player: Player): void {
		this.players.delete(player);
		if (this.players.size() < this.MIN_PLAYER_COUNT) this.endRound();
	}

	private checkPlayerCount(): void {
		const gameStateType = gameStateAtom().type;
		if (Players.GetPlayers().size() >= this.MIN_PLAYER_COUNT) {
			if (gameStateType === GameStateType.WaitingForPlayers || gameStateType === GameStateType.PostRound) {
				this.startIntermission();
			}
		} else if (gameStateType !== GameStateType.WaitingForPlayers) {
			this.changeGameState(GameStateType.WaitingForPlayers);
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
		if (gameStateAtom().type === GameStateType.WaitingForPlayers) this.checkPlayerCount();
	}
	private onPlayerRemoving(player: Player): void {
		if (gameStateAtom().type === GameStateType.Round) {
			this.removePlayerFromRound(player);
		} else {
			this.checkPlayerCount();
		}
	}
}
