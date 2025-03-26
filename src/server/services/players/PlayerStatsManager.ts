import { OnStart, Service } from "@flamework/core";
import Object from "@rbxts/object-utils";
import { Players } from "@rbxts/services";
import { fisherYatesShuffle } from "shared/utility";

interface PlayerStats {
	kills: number;
	deaths: number;

	damageDealt: number;
	damageTaken: number;

	blocksPlaced: number;
	blocksDestroyed: number;

	projectilesFired: number;
	projectilesHit: number;
}

interface Leaderstats extends Folder {
	Kills: IntValue;
	Deaths: IntValue;
}

type Award = {
	type: "good" | "bad";
	evaluate: (stats: PlayerStats) => [number, string];
};

@Service()
class PlayerStatsManager implements OnStart {
	private readonly AWARDS: Record<string, Award> = {
		["Demolitionist"]: {
			type: "good",
			evaluate: (stats) => [stats.blocksDestroyed, `Destroyed ${stats.blocksDestroyed} blocks`],
		},
		["One-Man Army"]: {
			type: "good",
			evaluate: (stats) => [stats.damageDealt, `Dealt ${stats.damageDealt} damage`],
		},
		["Master Builder"]: {
			type: "good",
			evaluate: (stats) => [stats.blocksPlaced, `Placed ${stats.blocksPlaced} blocks`],
		},
		["Sharpshooter"]: {
			type: "good",
			evaluate: (stats) => {
				const accuracy = stats.projectilesFired > 0 ? stats.projectilesHit / stats.projectilesFired : 0;
				return [accuracy, `Hit ${accuracy * 100}% of shots`];
			},
		},
		["Top Gun"]: {
			type: "good",
			evaluate: (stats) => [stats.kills, `Got ${stats.kills} kills`],
		},

		["Cannon Fodder"]: {
			type: "bad",
			evaluate: (stats) => [stats.deaths, `Died ${stats.deaths} times`],
		},
		["Sponge"]: {
			type: "bad",
			evaluate: (stats) => [stats.damageTaken, `Took ${stats.damageTaken} damage`],
		},
		["Stormtrooper"]: {
			type: "bad",
			evaluate: (stats) => {
				const accuracy = stats.projectilesFired > 0 ? 1 - stats.projectilesHit / stats.projectilesFired : 0;
				return [accuracy, `Missed ${accuracy * 100}% of shots`];
			},
		},
	};

	private playerStats: Map<Player, PlayerStats> = new Map();
	private leaderstats: Map<Player, Leaderstats> = new Map();

	public onStart(): void {
		Players.PlayerAdded.Connect((player) => this.onPlayerAdded(player));
	}

	public initializePlayer(player: Player): void {
		this.playerStats.set(player, {
			kills: 0,
			deaths: 0,
			damageDealt: 0,
			damageTaken: 0,
			blocksPlaced: 0,
			blocksDestroyed: 0,
			projectilesFired: 0,
			projectilesHit: 0,
		});
	}

	public incrementStat(player: Player, stat: keyof PlayerStats, amount: number = 1): void {
		const stats = this.playerStats.get(player);
		if (!stats) {
			warn(`Player ${player.Name} does not have stats initialized`);
			return;
		}
		stats[stat] += amount;

		const leaderstats = this.leaderstats.get(player);
		if (!leaderstats) {
			warn(`Player ${player.Name} does not have leaderstats initialized`);
			return;
		}
		switch (stat) {
			case "kills":
				leaderstats.Kills.Value += amount;
				break;
			case "deaths":
				leaderstats.Deaths.Value += amount;
				break;
		}
	}

	public getChampions(): Record<string, [Player, string]> {
		const shuffledAwards = fisherYatesShuffle(Object.keys(this.AWARDS));

		const selectedGood: string[] = [];
		const selectedBad: string[] = [];
		for (const award of shuffledAwards) {
			const numGood = selectedGood.size();
			const numBad = selectedBad.size();
			if (this.AWARDS[award].type === "good" && numGood < 3) {
				selectedGood.push(award);
			} else if (numBad < 2) {
				selectedBad.push(award);
			}
			if (numGood >= 3 && numBad >= 2) break;
		}

		const selectedAwards = [...selectedGood, ...selectedBad];
		const champions: Record<string, [Player, string]> = {};
		const assignedPlayers = new Set<Player>();

		for (const award of selectedAwards) {
			let bestPlayer: Player | undefined;
			let bestValue = -math.huge;
			let bestMessage = "";

			for (const [player, stats] of this.playerStats) {
				if (assignedPlayers.has(player)) continue;

				const [value, message] = this.AWARDS[award].evaluate(stats);
				if (value > bestValue) {
					bestPlayer = player;
					bestValue = value;
					bestMessage = message;
				}
			}

			if (!bestPlayer) {
				warn(`No eligible player found for the ${award} award`);
				continue;
			}

			champions[award] = [bestPlayer, bestMessage];
			assignedPlayers.add(bestPlayer);
		}

		return champions;
	}

	public clearAllStats(): void {
		this.playerStats.clear();

		this.leaderstats.forEach((leaderstats) => {
			leaderstats.Kills.Value = 0;
			leaderstats.Deaths.Value = 0;
		});
	}

	private onPlayerAdded(player: Player): void {
		const leaderstats = new Instance("Folder");
		leaderstats.Name = "leaderstats";
		leaderstats.Parent = player;

		const kills = new Instance("IntValue");
		kills.Name = "Kills";
		kills.Parent = leaderstats;

		const deaths = new Instance("IntValue");
		deaths.Name = "Deaths";
		deaths.Parent = leaderstats;

		this.leaderstats.set(player, leaderstats as Leaderstats);
	}
}

export default PlayerStatsManager;
