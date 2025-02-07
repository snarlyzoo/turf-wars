import { Components } from "@flamework/components";
import { OnStart, Service } from "@flamework/core";
import { Players } from "@rbxts/services";
import { PlayerComponent, GamePlayerComponent, LobbyPlayerComponent } from "server/components/players";
import { Events } from "server/network";
import { CharacterType } from "shared/types/characterTypes";

@Service()
export class PlayerRegistry implements OnStart {
	private readonly MAX_KICK_OFFENSES: number = 3;

	private playerComponents: Map<number, PlayerComponent> = new Map();

	private kickOffenses: Map<number, number> = new Map();

	public constructor(private components: Components) {}

	public onStart(): void {
		Players.PlayerAdded.Connect((player) => this.onPlayerAdded(player));
		Players.PlayerRemoving.Connect((player) => this.onPlayerRemoving(player));
	}

	public getPlayerComponent(player: Player): PlayerComponent | undefined {
		return this.playerComponents.get(player.UserId);
	}

	public setPlayerComponent(player: Player, characterType: CharacterType, loadCharacter: boolean = true): void {
		print(`Constructing ${characterType} player component for ${player.Name}...`);

		let playerComponent = this.getPlayerComponent(player);
		if (playerComponent) {
			this.destroyPlayerComponent(playerComponent);
		}

		if (characterType === CharacterType.Game) {
			playerComponent = this.components.addComponent<GamePlayerComponent>(player);
		} else {
			playerComponent = this.components.addComponent<LobbyPlayerComponent>(player);
		}
		this.playerComponents.set(player.UserId, playerComponent);

		if (loadCharacter) player.LoadCharacter();

		print(`${characterType} player component constructed for ${player.Name}`);
	}

	public setCombatEnabled(enabled: boolean): void {
		this.playerComponents.forEach((playerComponent) => {
			if (playerComponent instanceof GamePlayerComponent) {
				playerComponent.combatEnabled = enabled;
				Events.SetCombatEnabled.fire(playerComponent.instance, enabled);
			}
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

	private destroyPlayerComponent(playerComponent: PlayerComponent): void {
		const player = playerComponent.instance;
		if (playerComponent instanceof GamePlayerComponent) {
			this.components.removeComponent<GamePlayerComponent>(player);
		} else {
			this.components.removeComponent<LobbyPlayerComponent>(player);
		}
		this.playerComponents.delete(player.UserId);
	}

	private onPlayerAdded(player: Player): void {
		this.setPlayerComponent(player, CharacterType.Lobby, false);
		this.kickOffenses.set(player.UserId, 0);
	}
	private onPlayerRemoving(player: Player): void {
		const playerComponent = this.getPlayerComponent(player);
		if (playerComponent) {
			this.destroyPlayerComponent(playerComponent);
		}
		this.kickOffenses.delete(player.UserId);
	}
}
