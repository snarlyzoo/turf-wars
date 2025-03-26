import { BaseComponent, Component } from "@flamework/components";
import { OnStart } from "@flamework/core";
import { subscribe } from "@rbxts/charm";
import { Players } from "@rbxts/services";
import { RoundManager } from "server/services";
import { gameStateAtom, GameStateType } from "shared/state/GameState";
import { getRoundState } from "shared/state/RoundState";

interface Attributes {
	TeamId: "Team1" | "Team2";
}

interface TeamPortalInstance extends BasePart {
	SurfaceGui: SurfaceGui & {
		TextLabel: TextLabel;
	};
}

@Component({
	tag: "TeamPortal",
})
class TeamPortal extends BaseComponent<Attributes, TeamPortalInstance> implements OnStart {
	private team: Team | undefined;

	private messageId: number = 0;

	public constructor(private roundManager: RoundManager) {
		super();
	}

	public onStart(): void {
		subscribe(gameStateAtom, (state) => this.onGameStateChanged(state.type));
		this.instance.Touched.Connect((other) => this.onTouched(other));
	}

	private displayMessage(message: string): void {
		this.instance.SurfaceGui.TextLabel.Text = message;

		const messageId = this.messageId++;
		task.delay(2, () => {
			if (messageId === this.messageId)
				this.instance.SurfaceGui.TextLabel.Text = this.team ? `Join ${this.team.Name}` : "";
		});
	}

	private onGameStateChanged(stateType: GameStateType): void {
		if (stateType === GameStateType.Round) {
			const roundState = getRoundState();
			if (!roundState) return;

			this.team = this.attributes.TeamId === "Team1" ? roundState.team1 : roundState.team2;

			this.instance.CanTouch = true;
			this.instance.Transparency = 0.5;
			this.instance.BrickColor = this.team.TeamColor;

			this.instance.SurfaceGui.TextLabel.Text = `Join ${this.team.Name}`;
		} else {
			this.instance.CanTouch = false;
			this.instance.Transparency = 1;

			this.instance.SurfaceGui.TextLabel.Text = "";
		}
	}

	private onTouched(other: BasePart): void {
		if (!this.team) return;

		if (!other.Parent?.FindFirstChildOfClass("Humanoid")) return;

		const player = Players.GetPlayerFromCharacter(other.Parent);
		if (!player || player.Team !== this.roundManager.Spectators) return;

		if (!this.roundManager.requestJoinTeam(player, this.attributes.TeamId)) this.displayMessage(`Team is full`);
	}
}
