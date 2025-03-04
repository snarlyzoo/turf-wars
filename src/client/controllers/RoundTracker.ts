import { Controller, OnStart } from "@flamework/core";
import Signal from "@rbxts/signal";
import { Events } from "client/network";
import { BlockGrid } from "shared/modules";
import { GameState } from "shared/types";
import { ChampionStage, GameMap } from "shared/types/workspaceTypes";

@Controller()
export class RoundTracker implements OnStart {
	public get gameState(): GameState {
		return this._gameState;
	}
	private set gameState(value: GameState) {
		this._gameState = value;
		this.GameStateChanged.Fire(value);
	}
	private _gameState: GameState = GameState.WaitingForPlayers;
	public GameStateChanged: Signal<(gameState: GameState) => void> = new Signal();

	private team1?: Team;
	private team2?: Team;
	private gameMap?: GameMap;

	private winningTeam?: Team;
	private championData?: Array<[string, string, string]>;
	private championStage?: ChampionStage;

	public get time(): number {
		return this._time;
	}
	private set time(value: number) {
		this._time = value;
		this.startTimer();
	}
	public get stateName(): string {
		return this._stateName;
	}
	private set stateName(value: string) {
		this._stateName = value;
	}
	private _time: number = 0;
	private _stateName: string = "Waiting for players";
	public readonly GameClockChanged: Signal<() => void> = new Signal();
	private cancelTimer?: () => boolean;

	private team1Turf: number = 0;
	public readonly TurfChanged: Signal<() => void> = new Signal();

	public onStart(): void {
		Events.WaitingForPlayers.connect(() => (this.gameState = GameState.WaitingForPlayers));
		Events.IntermissionStarting.connect(() => (this.gameState = GameState.Intermission));

		Events.RoundStarting.connect((team1, team2, gameMap) => this.onRoundStarting(team1, team2, gameMap as GameMap));
		Events.RoundEnding.connect((winningTeam, championData, championStage) =>
			this.onRoundEnding(winningTeam, championData, championStage as ChampionStage),
		);

		Events.SetGameClock.connect((time, stateName) => this.onSetGameClock(time, stateName));
		Events.TurfChanged.connect((team1Turf) => this.onTurfChanged(team1Turf));
	}

	public isPositionOnTurf(position: Vector3, team: Team): boolean {
		if (!BlockGrid.isPositionInBounds(position)) return false;
		return team === this.team1 ? position.X < this.getTurfDivider() : position.X >= this.getTurfDivider();
	}

	public getTeams(): [Team, Team] | undefined {
		if (!this.team1 || !this.team2) {
			warn("Teams not set");
			return;
		}
		return [this.team1, this.team2];
	}
	public getGameMap(): GameMap | undefined {
		if (!this.gameMap) {
			warn("Game map not set");
			return;
		}
		return this.gameMap;
	}

	public getPostRoundInfo(): [Team, Array<[string, string, string]>, ChampionStage] | undefined {
		if (!this.winningTeam || !this.championData || !this.championStage) {
			warn("Post round info not set");
			return;
		}
		return [this.winningTeam, this.championData, this.championStage];
	}

	public getTeamTurf(team: Team): number {
		if (!this.team1 || !this.team2) {
			warn("Teams not set");
			return 0;
		}
		return team === this.team2 ? BlockGrid.DIMENSIONS.X - this.team1Turf : this.team1Turf;
	}

	private getTurfDivider(): number {
		return BlockGrid.MIN_BOUNDS.X + (this.team1Turf + 0.5) * BlockGrid.BLOCK_SIZE;
	}

	private onRoundStarting(team1: Team, team2: Team, gameMap: GameMap): void {
		this.team1 = team1;
		this.team2 = team2;

		this.gameMap = gameMap;

		this.team1Turf = BlockGrid.DIMENSIONS.X / 2;

		this.gameState = GameState.Round;
	}
	private onRoundEnding(
		winningTeam: Team,
		championData: Array<[string, string, string]>,
		championStage: ChampionStage,
	): void {
		this.winningTeam = winningTeam;
		this.championData = championData;
		this.championStage = championStage;

		this.gameState = GameState.PostRound;
	}

	private onSetGameClock(time: number, stateName: string): void {
		this.time = time;
		this.stateName = stateName;
		this.GameClockChanged.Fire();
	}
	private onTurfChanged(team1Turf: number): void {
		this.team1Turf = team1Turf;
		this.TurfChanged.Fire();
	}

	private startTimer(): void {
		if (this.cancelTimer) this.cancelTimer();

		let cancelled = false;
		task.spawn(() => {
			while (this.time > 0) {
				if (cancelled) return;
				task.wait(1);
				this.time--;
			}
		});
		this.cancelTimer = (): boolean => (cancelled = true);
	}
}
