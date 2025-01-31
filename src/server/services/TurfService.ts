import { OnTick, Service } from "@flamework/core";
import { Players } from "@rbxts/services";
import { Events } from "server/network";
import { BlockGrid } from "shared/modules";
import { GameMap, TeamSpawn } from "shared/types/workspaceTypes";

@Service()
export class TurfService implements OnTick {
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

		this.turfLines.forEach(
			(turfLine, index) => (turfLine.BrickColor = index <= this.team1Turf ? team1.TeamColor : team2.TeamColor),
		);

		this.setupTeamSpawn(gameMap.Team1Spawn, team1.TeamColor);
		this.setupTeamSpawn(gameMap.Team2Spawn, team2.TeamColor);

		Events.TurfChanged.broadcast(this.team1Turf);
	}

	public onTick(): void {
		this.enforceTurfBoundaries();
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

	public setTurfPerKill(turfPerKill: number): void {
		this.turfPerKill = turfPerKill;
	}

	private claimTurf(team: Team): void {
		if (!this.team1 || !this.team2) {
			warn("Teams have not been set");
			return;
		}
		if (!this.turfLines) {
			warn("Turf lines have not been set");
			return;
		}

		let start, finish, step, teamColor;
		if (team === this.team1) {
			start = this.team1Turf + 1;
			finish = math.min(this.team1Turf + this.turfPerKill, BlockGrid.DIMENSIONS.X);
			step = 1;
			teamColor = this.team1.TeamColor;
		} else if (team === this.team2) {
			start = this.team1Turf;
			finish = math.max(this.team1Turf - this.turfPerKill, 0);
			step = -1;
			teamColor = this.team2.TeamColor;
		} else {
			warn(`${team.Name} is not a valid team`);
			return;
		}

		for (let i = start; step > 0 ? i <= finish : i >= finish; i += step) {
			const blocks = this.blocksOnTurfLine.get(i) || [];
			blocks.forEach((block) => block.Destroy());
			this.blocksOnTurfLine.delete(i);

			this.turfLines[i].BrickColor = teamColor;
		}

		print(`${team.Name} claimed ${math.abs(finish - start)} turf lines`);

		if (finish === 0 || finish === BlockGrid.DIMENSIONS.X) {
			print(`${team.Name} has won!`);
			// TODO: End the game
		}
		this.team1Turf = finish;

		Events.TurfChanged.broadcast(this.team1Turf);
	}

	private enforceTurfBoundaries(): void {
		if (!this.team1 || !this.team2) return;

		Players.GetPlayers().forEach((player) => {
			const isTeam1 = player.Team === this.team1;
			if (!isTeam1 && player.Team !== this.team2) return;

			const character = player.Character;
			if (!character || !character.PrimaryPart) {
				this.outOfBoundsPlayers.delete(player.UserId);
				return;
			}

			const charCFrame = character.GetPivot();
			const charPosX = charCFrame.Position.X;
			if (isTeam1 ? charPosX >= this.getTurfDivider() : charPosX < this.getTurfDivider()) {
				if (!this.outOfBoundsPlayers.has(player.UserId)) {
					this.outOfBoundsPlayers.add(player.UserId);

					character.PivotTo(charCFrame.add(new Vector3(0, BlockGrid.BLOCK_SIZE, 0)));
					character.PrimaryPart.AssemblyLinearVelocity = this.OUT_OF_BOUNDS_KICK.mul(
						new Vector3(isTeam1 ? -1 : 1, 1, 1),
					);

					print(`${player.Name} was kicked back to their turf`);
				}
			} else {
				this.outOfBoundsPlayers.delete(player.UserId);
			}
		});
	}

	private getTurfDivider(): number {
		return BlockGrid.MIN_BOUNDS.X + (this.team1Turf + 0.5) * BlockGrid.BLOCK_SIZE;
	}

	private setupTeamSpawn(teamSpawn: TeamSpawn, teamColor: BrickColor): void {
		teamSpawn.SpawnLocations.GetChildren()
			.filter((child) => child.IsA("SpawnLocation"))
			.forEach((spawn) => {
				spawn.Enabled = true;
				spawn.TeamColor = teamColor;
			});

		teamSpawn.TeamColorParts.GetChildren()
			.filter((child) => child.IsA("BasePart"))
			.forEach((part) => (part.BrickColor = teamColor));
	}
}
