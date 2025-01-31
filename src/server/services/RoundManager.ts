import { Flamework, OnStart, Service } from "@flamework/core";
import { Players, RunService, ServerStorage, Teams, Workspace } from "@rbxts/services";
import Signal from "@rbxts/signal";
import { PlayerRegistry, TurfService } from ".";
import { CharacterType } from "shared/types/characterTypes";
import { GameMap } from "shared/types/workspaceTypes";
import { Events } from "server/network";
import { BlockGrid } from "shared/modules";

enum GameState {
	WaitingForPlayers = "Waiting for Players",
	Intermission = "Intermission",
	PreRound = "Pre-round",
	InRound = "In Round",
	PostRound = "Post-round",
}

type Phase = {
	Type: PhaseType;
	Duration: number;
	TurfPerKill?: number;
};
enum PhaseType {
	Build = "Build",
	Combat = "Combat",
}

const isGameMap = Flamework.createGuard<GameMap>();

function fisherYatesShuffle<T>(array: T[]): T[] {
	const shuffled = [...array];
	for (let i = shuffled.size() - 1; i > 0; i--) {
		const j = math.floor(math.random() * (i + 1));
		[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
	}
	return shuffled;
}

@Service()
export class RoundManager implements OnStart {
	private readonly MIN_PLAYER_COUNT: number = 2;
	private readonly INTERMISSION_TIME: number = 30;

	private readonly PHASE_SEQUENCE: Phase[] = [
		{ Type: PhaseType.Build, Duration: 40 },
		{ Type: PhaseType.Combat, Duration: 90 },
		{ Type: PhaseType.Build, Duration: 20 },
		{ Type: PhaseType.Combat, Duration: 90, TurfPerKill: 3 },
	];

	private readonly SPECTATOR_TEAM: Team = Teams.FindFirstChild("Spectators") as Team;

	private readonly GAME_MAP_PREFAB: GameMap;
	private readonly MAP_LOAD_TIMEOUT: number = 10;

	public StateChanged: Signal<(newState: GameState) => void> = new Signal();

	public get state(): GameState {
		return this._state;
	}
	private set state(value: GameState) {
		this._state = value;
	}

	private _state: GameState = GameState.WaitingForPlayers;

	private timer?: thread;
	private phaseIndex: number = 0;

	private players: Set<Player> = new Set();

	private team1: Team = Teams.FindFirstChild("Blue Team") as Team;
	private team2: Team = Teams.FindFirstChild("Red Team") as Team;

	private gameMap?: GameMap;

	public constructor(private playerRegistry: PlayerRegistry, private turfService: TurfService) {
		const map = ServerStorage.FindFirstChild("Map");
		if (!map || !isGameMap(map)) {
			error("No valid map found in server storage");
		}
		this.GAME_MAP_PREFAB = map;

		if (RunService.IsStudio()) {
			this.MIN_PLAYER_COUNT = 1;
			this.INTERMISSION_TIME = 2;
			this.PHASE_SEQUENCE = [
				{ Type: PhaseType.Build, Duration: 5 },
				{ Type: PhaseType.Combat, Duration: 60 },
			];
		}
	}

	public onStart(): void {
		Players.PlayerAdded.Connect(() => this.onPlayerAdded());
		Players.PlayerRemoving.Connect((player) => this.onPlayerRemoving(player));
	}

	private changeState(newState: GameState): void {
		if (this.state === newState) {
			return;
		}

		print(`Changing state to ${newState}`);

		if (this.timer) {
			if (coroutine.status(this.timer) === "suspended") {
				coroutine.close(this.timer);
			}
			this.timer = undefined;
		}

		this.state = newState;
		this.StateChanged.Fire(newState);
	}

	private startIntermission(): void {
		this.changeState(GameState.Intermission);

		this.timer = task.delay(this.INTERMISSION_TIME, () => {
			this.startRound();
		});
	}

	private async startRound(): Promise<void> {
		if (this.state !== GameState.Intermission) {
			return;
		}

		this.changeState(GameState.PreRound);

		print("Loading game map...");

		this.gameMap?.Destroy();
		this.gameMap = this.GAME_MAP_PREFAB.Clone();
		this.gameMap.Parent = Workspace;
		if (!(await this.waitForGameMap(this.gameMap))) {
			error("Failed to load game map");
		}

		print("Game map loaded");

		this.turfService.initialize(this.team1, this.team2, this.gameMap);

		Players.GetPlayers().forEach((player) => this.players.add(player));

		this.shuffleTeams();
		this.setPlayerComponents(CharacterType.Game);

		Events.RoundStarted.broadcast(this.team1, this.team2);

		this.changeState(GameState.InRound);
		this.setPhaseIndex(0);
	}
	private endRound(): void {
		if (this.state === GameState.PreRound) {
			this.StateChanged.Wait();
		}
		if (this.state !== GameState.InRound) {
			return;
		}

		this.changeState(GameState.PostRound);

		this.players.forEach((player) => (player.Team = this.SPECTATOR_TEAM));
		this.setPlayerComponents(CharacterType.Lobby);

		this.players.clear();

		this.checkPlayerCount();
	}

	private setPhaseIndex(index: number): void {
		this.phaseIndex = index;

		const phase = this.PHASE_SEQUENCE[index];

		const isCombat = phase.Type === PhaseType.Combat;
		if (isCombat) {
			this.turfService.setTurfPerKill(phase.TurfPerKill ?? 1);
		}
		this.playerRegistry.setCombatEnabled(isCombat);

		print(`Starting ${phase.Type} phase ${index + 1}`);

		this.timer = task.delay(phase.Duration, () => {
			if (this.phaseIndex < this.PHASE_SEQUENCE.size() - 1) {
				this.setPhaseIndex(this.phaseIndex + 1);
			} else {
				this.endRound();
			}
		});
	}

	private async waitForGameMap(map: GameMap): Promise<boolean> {
		const start = os.clock();

		while (os.clock() - start < this.MAP_LOAD_TIMEOUT) {
			if (!map.TurfLines || !map.Team1Spawn || !map.Team2Spawn) {
				task.wait(0.1);
				continue;
			}

			if (map.TurfLines.GetChildren().size() < BlockGrid.DIMENSIONS.X) {
				task.wait(0.1);
				continue;
			}

			if (map.Team1Spawn.GetChildren().size() === 0 || map.Team2Spawn.GetChildren().size() === 0) {
				task.wait(0.1);
				continue;
			}

			return true;
		}

		return false;
	}

	private removePlayerFromRound(player: Player): void {
		this.players.delete(player);

		if (this.players.size() < this.MIN_PLAYER_COUNT) {
			this.endRound();
		}
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

	private async setPlayerComponents(characterType: CharacterType): Promise<void> {
		const promises = [...this.players].map((player) =>
			this.playerRegistry.setPlayerComponent(player, characterType),
		);
		await Promise.all(promises);
	}

	private shuffleTeams(): void {
		let index = 0;
		fisherYatesShuffle([...this.players]).forEach((player) => {
			player.Team = index % 2 === 0 ? this.team1 : this.team2;
			index++;
		});
	}

	private onPlayerAdded(): void {
		if (this.state === GameState.WaitingForPlayers) {
			this.checkPlayerCount();
		}
	}
	private onPlayerRemoving(player: Player): void {
		if (this.state === GameState.PreRound || this.state === GameState.InRound) {
			this.removePlayerFromRound(player);
		} else {
			this.checkPlayerCount();
		}
	}
}
