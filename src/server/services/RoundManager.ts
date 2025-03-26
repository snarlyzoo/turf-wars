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
import { GameMap, TeamSpawn } from "shared/types/workspaceTypes";
import { fisherYatesShuffle } from "shared/utility";
import { TurfService } from ".";
import { GamePlayerComponent, LobbyPlayerComponent } from "server/components/players";

type Phase = {
	Type: PhaseType;
	Duration: number;

	turfPerKill?: number;

	blockCount?: number;
	projectileCount?: number;
};

const isGameMap = Flamework.createGuard<GameMap>();

@Service()
class RoundManager implements OnStart {
	private readonly MIN_PLAYER_COUNT: number = 2;

	private readonly INTERMISSION_TIME: number = 30;
	private readonly ROUND_START_COUNTDOWN: number = 10;
	private readonly CHAMPION_DISPLAY_TIME: number = 15;

	private readonly PHASE_SEQUENCE: Phase[] = [
		{ Type: PhaseType.Build, Duration: 40, blockCount: 32 },
		{ Type: PhaseType.Combat, Duration: 90, projectileCount: 16 },
		{ Type: PhaseType.Build, Duration: 20, blockCount: 32 },
		{ Type: PhaseType.Combat, Duration: 90, turfPerKill: 3, projectileCount: 8 },
	];

	private readonly MAP_LOAD_TIMEOUT: number = 10;

	public readonly Spectators: Team;

	private readonly GameMapPrefab: GameMap;

	private phaseIndex: number = 0;
	private cancelTimer?: () => boolean;

	private players: Set<Player> = new Set();

	public constructor(
		private playerRegistry: PlayerRegistry,
		private playerStatsManager: PlayerStatsManager,
		private turfService: TurfService,
	) {
		if (RunService.IsStudio()) {
			this.MIN_PLAYER_COUNT = 1;
			this.INTERMISSION_TIME = 2;
			this.ROUND_START_COUNTDOWN = 2;
			this.CHAMPION_DISPLAY_TIME = 2;
			this.PHASE_SEQUENCE = [
				{ Type: PhaseType.Build, Duration: 2, blockCount: 32 },
				//{ Type: PhaseType.Combat, Duration: 60, projectileCount: 16 },
			];
		}

		const spectators = Teams.FindFirstChild("Spectators");
		if (!spectators || !spectators.IsA("Team")) error("No spectators team found");
		this.Spectators = spectators;

		const gameMap = ServerStorage.FindFirstChild("GameMap");
		if (!gameMap || !isGameMap(gameMap)) error("No valid map found in server storage");
		this.GameMapPrefab = gameMap;
	}

	public onStart(): void {
		Players.PlayerAdded.Connect(() => this.onPlayerAdded());
		Players.PlayerRemoving.Connect((player) => this.onPlayerRemoving(player));

		startWaitingForPlayersTimer();
	}

	public requestJoinTeam(player: Player, teamId: "Team1" | "Team2"): boolean {
		if (gameStateAtom().type !== GameStateType.Round) return false;
		if (player.Team !== this.Spectators) return false;

		const roundState = getRoundState();
		if (!roundState) return false;

		const [joinTeam, otherTeam] =
			teamId === "Team1" ? [roundState.team1, roundState.team2] : [roundState.team2, roundState.team1];
		if (joinTeam.GetPlayers().size() > otherTeam.GetPlayers().size() + 1) return false;

		this.players.add(player);
		this.playerStatsManager.initializePlayer(player);
		player.Team = joinTeam;

		const gamePlayer = this.playerRegistry.setPlayerComponent(player, GamePlayerComponent);
		const totals = this.PHASE_SEQUENCE.reduce(
			(acc, phase, index) => {
				if (index < this.phaseIndex) {
					acc.blockCount += phase.blockCount ?? 0;
					acc.projectileCount += phase.projectileCount ?? 0;
				}
				return acc;
			},
			{ blockCount: 0, projectileCount: 0 },
		);
		gamePlayer.giveResources(totals.blockCount, totals.projectileCount);

		print(`${player.Name} joined ${joinTeam.Name}`);

		return true;
	}

	private startIntermission(): void {
		this.changeGameState(GameStateType.Intermission);
		this.promiseTimer(this.INTERMISSION_TIME)
			.andThen(() => this.startRound())
			.catch((err) => warn(err));
	}

	private async startRound(): Promise<void> {
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

		this.changeGameState(GameStateType.Round);

		this.turfService.reset();

		Players.GetPlayers().forEach((player) => {
			this.players.add(player);
			this.playerStatsManager.initializePlayer(player);
		});

		this.shuffleTeams(team1, team2);
		this.players.forEach((player) => this.playerRegistry.setPlayerComponent(player, GamePlayerComponent));

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

		this.giveResourcesToAll(phase.blockCount, phase.projectileCount);

		setPhase(phase.Type, phase.Duration);
		this.phaseIndex = index;

		this.promiseTimer(phase.Duration)
			.andThen(() => this.runPhase(index + 1))
			.catch((err) => warn(err));
	}

	private async endRound(): Promise<void> {
		this.changeGameState(GameStateType.PostRound);

		await this.displayChampions();

		this.players.forEach((player) => (player.Team = this.Spectators));

		this.players.clear();
		this.playerStatsManager.clearAllStats();

		Players.GetPlayers().forEach((player) => this.playerRegistry.setPlayerComponent(player, LobbyPlayerComponent));

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
			const map = this.GameMapPrefab.Clone();
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

	private async displayChampions(): Promise<void> {
		const roundState = getRoundState();
		if (!roundState) return;

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

		const positions = [
			championStage.Positions.First,
			championStage.Positions.Second,
			championStage.Positions.Third,
			championStage.Positions.Fourth,
			championStage.Positions.Fifth,
		];
		const championData: Array<[string, string, string]> = [];
		const characters: Array<Model> = [];
		Object.entries(this.playerStatsManager.getChampions()).forEach(([award, [player, message]], i) => {
			print(`${player.Name} wins the ${award} award: ${message}`);

			championData.push([player.Name, award, message]);

			const character = Players.CreateHumanoidModelFromUserId(player.UserId);
			character.Parent = Workspace;
			characters.push(character);

			const rootPart = character.FindFirstChild("HumanoidRootPart");
			if (!rootPart || !rootPart.IsA("BasePart")) return;
			character.PrimaryPart = rootPart;

			const humanoid = character.FindFirstChildOfClass("Humanoid");
			if (!humanoid) return;

			let yOffset = 3;
			if (humanoid.RigType === Enum.HumanoidRigType.R15) {
				yOffset = humanoid.HipHeight + rootPart.Size.Y / 2;

				const description = humanoid.GetAppliedDescription();
				description.HeightScale = 1;
				description.WidthScale = 1;
				description.HeadScale = 1;
				description.BodyTypeScale = 0;
				description.ProportionScale = 0;
				humanoid.ApplyDescription(description);
			}

			character.PivotTo(positions[i].GetPivot().add(new Vector3(0, yOffset, 0)));
			rootPart.Anchored = true;
		});
		Events.RoundEnded.broadcast(winningTeam, championData);

		this.playerRegistry.deactivateAllPlayers();

		await Promise.delay(this.CHAMPION_DISPLAY_TIME);

		characters.forEach((character) => character.Destroy());

		task.defer(() => gameMap.Destroy());
		clearRoundState();
	}

	private giveResourcesToAll(blockCount?: number, projectileCount?: number): void {
		if (blockCount === undefined && projectileCount === undefined) return;

		this.players.forEach((player) => {
			const gamePlayer = this.playerRegistry.getPlayerComponent(player, GamePlayerComponent);
			if (gamePlayer) gamePlayer.giveResources(blockCount, projectileCount);
		});
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

export default RoundManager;
