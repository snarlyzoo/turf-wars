import { OnStart, Service } from "@flamework/core";
import { Players } from "@rbxts/services";

interface PlayerStats {
	kills: number;
	deaths: number;

	damageDealt: number;
	damageTaken: number;

	blocksPlaced: number;
	blocksDestroyed: number;

	projectilesFired: number;
}

@Service()
export class PlayerStatsManager implements OnStart {
	private playerStats: Map<Player, PlayerStats> = new Map();

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
		});
	}

	public incrementStat(player: Player, stat: keyof PlayerStats, amount: number = 1): void {
		const stats = this.playerStats.get(player);
		if (!stats) {
			warn(`Player ${player.Name} does not have stats initialized`);
			return;
		}
		stats[stat] += amount;

		if (stat === "kills" || stat === "deaths") {
			const leaderstats = player.FindFirstChild("leaderstats");
			if (!leaderstats) return;

			const statValue = leaderstats.FindFirstChild(stat.sub(1, 1).upper() + stat.sub(2));
			if (!statValue || !statValue.IsA("IntValue")) return;
			statValue.Value = stats[stat];
		}
	}

	public clearAllStats(): void {
		this.playerStats.clear();
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
	}
}
