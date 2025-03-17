import { Service } from "@flamework/core";
import { BlockGrid } from "shared/modules";
import { getRoundState, setTeam1Turf } from "shared/state/RoundState";
import { HumanoidCharacterInstance } from "shared/types/characterTypes";
import { GameMap, TeamSpawn } from "shared/types/workspaceTypes";

@Service()
export class TurfService {
	private readonly OUT_OF_BOUNDS_KICK = new Vector3(75, 25, 0);

	private turfLines?: BasePart[];
	private blocksOnTurfLine: Map<number, BasePart[]> = new Map();

	private outOfBoundsPlayers: Set<number> = new Set();

	public reset(): void {
		const roundState = getRoundState();
		if (!roundState) return;

		const gameMap = roundState.gameMap as GameMap;
		this.turfLines = gameMap.TurfLines.GetChildren()
			.filter((child) => child.IsA("BasePart"))
			.sort((a, b) => a.Name < b.Name);
		this.blocksOnTurfLine.clear();

		setTeam1Turf(BlockGrid.DIMENSIONS.X / 2);

		this.outOfBoundsPlayers.clear();

		BlockGrid.clear();

		const [team1Color, team2Color] = [roundState.team1.TeamColor, roundState.team2.TeamColor];
		this.turfLines.forEach(
			(turfLine, index) => (turfLine.BrickColor = index < BlockGrid.DIMENSIONS.X / 2 ? team1Color : team2Color),
		);
		this.setupTeamSpawn(gameMap.Team1Spawn, team1Color);
		this.setupTeamSpawn(gameMap.Team2Spawn, team2Color);
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

	public kickCharacterBackToTurf(character: HumanoidCharacterInstance, team: Team): void {
		const roundState = getRoundState();
		if (!roundState) return;

		let kickDirection: Vector3;
		if (team === roundState.team1) {
			kickDirection = new Vector3(-1, 0, 0);
		} else if (team === roundState.team2) {
			kickDirection = new Vector3(1, 0, 0);
		} else {
			warn(`${team.Name} is not a valid team`);
			return;
		}

		character.PivotTo(character.GetPivot().add(new Vector3(0, BlockGrid.BLOCK_SIZE, 0)));
		character.HumanoidRootPart.AssemblyLinearVelocity = this.OUT_OF_BOUNDS_KICK.mul(kickDirection);
	}

	private claimTurf(team: Team): void {
		const roundState = getRoundState();
		if (!roundState) return;

		if (!this.turfLines) {
			warn("Turf lines have not been set");
			return;
		}

		let start: number, finish: number, step: number;
		let teamColor: BrickColor;
		if (team === roundState.team1) {
			start = roundState.team1Turf;
			finish = math.min(roundState.team1Turf + roundState.turfPerKill, BlockGrid.DIMENSIONS.X);
			step = 1;
			teamColor = roundState.team1.TeamColor;
		} else if (team === roundState.team2) {
			start = roundState.team1Turf - 1;
			finish = math.max(roundState.team1Turf - roundState.turfPerKill, 0);
			step = -1;
			teamColor = roundState.team2.TeamColor;
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

		setTeam1Turf(finish);
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
