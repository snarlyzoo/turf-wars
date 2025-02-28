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

interface Leaderstats extends Folder {
	Kills: IntValue;
	Deaths: IntValue;
}

@Service()
export class PlayerStatsManager implements OnStart {
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

	public getMVPs(team: Team): Array<Player> {
		const sortedPlayers = team.GetPlayers().sort((a, b) => {
			const aKills = this.playerStats.get(a)?.kills ?? 0;
			const bKills = this.playerStats.get(b)?.kills ?? 0;
			return bKills > aKills;
		});

		const mvpPlayers = new Array<Player>();
		for (let i = 0; i < math.min(3, sortedPlayers.size()); i++) {
			mvpPlayers.push(sortedPlayers[i]);
		}
		return mvpPlayers;
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
