import { Service } from "@flamework/core";
import { Events } from "server/network";
import { BlockGrid } from "shared/modules";
import { HumanoidCharacterInstance } from "shared/types/characterTypes";
import { GameMap, TeamSpawn } from "shared/types/workspaceTypes";

@Service()
export class TurfService {
	private readonly OUT_OF_BOUNDS_KICK = new Vector3(75, 25, 0);

	private team1?: Team;
	private team2?: Team;

	private turfLines?: BasePart[];
	private blocksOnTurfLine: Map<number, BasePart[]> = new Map();

	private team1Turf: number = 0;
	private turfPerKill: number = 1;

	private outOfBoundsPlayers: Set<number> = new Set();

	public initialize(team1: Team, team2: Team, gameMap: GameMap): void {
		this.team1 = team1;
		this.team2 = team2;

		this.turfLines = gameMap.TurfLines.GetChildren()
			.filter((child) => child.IsA("BasePart"))
			.sort((a, b) => a.Name < b.Name);
		this.blocksOnTurfLine.clear();

		this.team1Turf = BlockGrid.DIMENSIONS.X / 2;
		this.turfPerKill = 1;

		this.outOfBoundsPlayers.clear();

		BlockGrid.clear();

		this.turfLines.forEach(
			(turfLine, index) => (turfLine.BrickColor = index < this.team1Turf ? team1.TeamColor : team2.TeamColor),
		);

		this.setupTeamSpawn(gameMap.Team1Spawn, team1.TeamColor);
		this.setupTeamSpawn(gameMap.Team2Spawn, team2.TeamColor);

		Events.TurfChanged.broadcast(this.team1Turf);
	}

	public registerBlock(block: BasePart): void {
		if (!this.turfLines) {
			warn("Turf lines have not been set");
			return;
		}

		const lineIndex = math.floor((block.Position.X - BlockGrid.MIN_BOUNDS.X) / BlockGrid.BLOCK_SIZE);
		if (lineIndex < 0 || lineIndex >= BlockGrid.DIMENSIONS.X) {
			warn("Block is not on a turf line");
			return;
		}

		const blocks = this.blocksOnTurfLine.get(lineIndex) || [];
		blocks.push(block);
		this.blocksOnTurfLine.set(lineIndex, blocks);
	}

	public registerKill(team: Team): void {
		this.claimTurf(team);
	}

	public isPositionOnTurf(position: Vector3, team: Team): boolean {
		return this.isPositionValid(position, team);
	}

	public isOnCorrectSide(position: Vector3, team: Team): boolean {
		return this.isPositionValid(position, team, false);
	}

	public kickCharacterBackToTurf(character: HumanoidCharacterInstance, team: Team): void {
		if (!this.validateTeams()) return;

		let kickDirection: Vector3;
		if (team === this.team1) {
			kickDirection = new Vector3(-1, 0, 0);
		} else if (team === this.team2) {
			kickDirection = new Vector3(1, 0, 0);
		} else {
			warn(`${team.Name} is not a valid team`);
			return;
		}

		character.PivotTo(character.GetPivot().add(new Vector3(0, BlockGrid.BLOCK_SIZE, 0)));
		character.HumanoidRootPart.AssemblyLinearVelocity = this.OUT_OF_BOUNDS_KICK.mul(kickDirection);
	}

	public setTurfPerKill(turfPerKill: number): void {
		this.turfPerKill = turfPerKill;
	}

	private validateTeams(): boolean {
		if (!this.team1 || !this.team2) {
			warn("Teams have not been set");
			return false;
		}
		return true;
	}

	private getTurfDivider(): number {
		return BlockGrid.MIN_BOUNDS.X + (this.team1Turf + 0.5) * BlockGrid.BLOCK_SIZE;
	}

	private isPositionValid(position: Vector3, team: Team, checkGridBounds: boolean = true): boolean {
		if (!this.validateTeams()) return false;
		if (checkGridBounds && !BlockGrid.isPositionInBounds(position)) return false;

		if (team === this.team1) {
			return position.X < this.getTurfDivider();
		} else if (team === this.team2) {
			return position.X >= this.getTurfDivider();
		} else {
			warn(`${team.Name} is not a valid team`);
			return false;
		}
	}

	private claimTurf(team: Team): void {
		if (!this.validateTeams()) return;
		if (!this.turfLines) {
			warn("Turf lines have not been set");
			return;
		}

		let start: number, finish: number, step: number;
		let teamColor: BrickColor;
		if (team === this.team1) {
			start = this.team1Turf;
			finish = math.min(this.team1Turf + this.turfPerKill, BlockGrid.DIMENSIONS.X);
			step = 1;
			teamColor = this.team1.TeamColor;
		} else if (team === this.team2) {
			start = this.team1Turf - 1;
			finish = math.max(this.team1Turf - this.turfPerKill, 0);
			step = -1;
			teamColor = this.team2.TeamColor;
		} else {
			warn(`${team.Name} is not a valid team`);
			return;
		}

		for (let i = start; step > 0 ? i < finish : i >= finish; i += step) {
			const blocks = this.blocksOnTurfLine.get(i) || [];
			blocks.forEach((block) => block.Destroy());
			this.blocksOnTurfLine.delete(i);

			this.turfLines[i].BrickColor = teamColor;
		}

		print(`${team.Name} claimed ${step > 0 ? finish - start : start - finish + 1} turf lines`);

		if (finish === 0 || finish === BlockGrid.DIMENSIONS.X) {
			print(`${team.Name} has won`);
			// TODO: End the round
		}

		this.team1Turf = finish;
		Events.TurfChanged.broadcast(this.team1Turf);
	}

	private setupTeamSpawn(teamSpawn: TeamSpawn, teamColor: BrickColor): void {
		teamSpawn.SpawnLocations.GetChildren()
			.filter((child) => child.IsA("SpawnLocation"))
			.forEach((spawn) => {
				spawn.Enabled = true;
				spawn.TeamColor = teamColor;
			});

		[...teamSpawn.SpawnBarriers.GetChildren(), ...teamSpawn.TeamColorParts.GetChildren()]
			.filter((child) => child.IsA("BasePart"))
			.forEach((part) => (part.BrickColor = teamColor));
	}
}
