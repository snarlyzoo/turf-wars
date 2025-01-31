import { Controller, OnStart } from "@flamework/core";
import { Events } from "client/network";
import { BlockGrid } from "shared/modules";

@Controller()
export class TurfTracker implements OnStart {
	private team1?: Team;
	private team2?: Team;

	private team1Turf: number = 0;

	public onStart(): void {
		Events.RoundStarted.connect((team1, team2) => this.initialize(team1, team2));
		Events.TurfChanged.connect((team1Turf) => (this.team1Turf = team1Turf));
	}

	public initialize(team1: Team, team2: Team): void {
		this.team1 = team1;
		this.team2 = team2;

		this.team1Turf = BlockGrid.DIMENSIONS.X / 2;
	}

	public isPositionOnTurf(position: Vector3, team: Team): boolean {
		if (!this.team1 || !this.team2) {
			warn("Teams have not been set");
			return false;
		}
		if (!BlockGrid.isPositionInBounds(position)) return false;

		if (team === this.team1) {
			return position.X < this.getTurfDivider();
		} else if (team === this.team2) {
			return position.X >= this.getTurfDivider();
		} else {
			warn(`${team.Name} is not a valid team`);
			return false;
		}
	}

	private getTurfDivider(): number {
		return BlockGrid.MIN_BOUNDS.X + (this.team1Turf + 0.5) * BlockGrid.BLOCK_SIZE;
	}
}
