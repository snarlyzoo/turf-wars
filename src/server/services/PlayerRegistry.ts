import { Components } from "@flamework/components";
import { OnStart, Service } from "@flamework/core";
import { Players } from "@rbxts/services";
import { TWPlayerComponent } from "server/components";

@Service()
export class PlayerRegistry implements OnStart {
	private readonly MAX_KICK_OFFENSES = 3;

	private twPlayers = new Map<number, TWPlayerComponent>();

	private kickOffenses = new Map<number, number>();

	public constructor(private components: Components) {}

	public onStart(): void {
		Players.PlayerAdded.Connect((player) => this.onPlayerAdded(player));
		Players.PlayerRemoving.Connect((player) => this.onPlayerRemoving(player));
	}

	public getTWPlayer(player: Player): TWPlayerComponent | undefined {
		return this.twPlayers.get(player.UserId);
	}

	public setCombatEnabledForAll(enabled: boolean): void {
		this.twPlayers.forEach((twPlayer) => {
			twPlayer.combatEnabled = enabled;
		});
	}

	public kickPlayer(player: Player, reason: string): void {
		warn(`Kicking ${player.Name} for ${reason}`);
		player.Kick(reason);
	}

	public addKickOffense(player: Player, reason: string): void {
		const offenses = this.kickOffenses.get(player.UserId) ?? 0;
		if (offenses >= this.MAX_KICK_OFFENSES) {
			this.kickPlayer(player, reason);
		}
		this.kickOffenses.set(player.UserId, offenses + 1);
	}

	private onPlayerAdded(player: Player): void {
		print(`Constructing player component for ${player.Name}...`);

		this.twPlayers.set(player.UserId, this.components.addComponent<TWPlayerComponent>(player));

		this.kickOffenses.set(player.UserId, 0);

		print(`Player component constructed for ${player.Name}.`);
	}
	private onPlayerRemoving(player: Player): void {
		this.components.removeComponent<TWPlayerComponent>(player);
		this.twPlayers.delete(player.UserId);

		this.kickOffenses.delete(player.UserId);
	}
}
