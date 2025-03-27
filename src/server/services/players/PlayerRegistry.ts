import { Components } from "@flamework/components";
import { OnStart, Service } from "@flamework/core";
import { AbstractConstructor, Constructor } from "@flamework/core/out/utility";
import { Players } from "@rbxts/services";
import { PlayerComponent, GamePlayerComponent, LobbyPlayerComponent } from "server/components/players";
import { Events } from "server/network";
import { CharacterType } from "shared/types/characterTypes";

@Service()
class PlayerRegistry implements OnStart {
	private readonly MAX_KICK_OFFENSES: number = 3;

	private playerComponents: Map<number, PlayerComponent> = new Map();

	private kickOffenses: Map<number, number> = new Map();

	public constructor(private components: Components) {}

	public onStart(): void {
		Players.PlayerAdded.Connect((player) => this.onPlayerAdded(player));
		Players.PlayerRemoving.Connect((player) => this.onPlayerRemoving(player));
	}

	public getPlayerComponent<T extends PlayerComponent>(
		player: Player,
		componentClass: AbstractConstructor<T>,
	): T | undefined {
		const playerComponent = this.playerComponents.get(player.UserId);
		return playerComponent instanceof componentClass ? playerComponent : undefined;
	}

	public setPlayerComponent<T extends PlayerComponent>(
		player: Player,
		componentClass: Constructor<T>,
		loadCharacter: boolean = true,
	): T {
		this.destroyPlayerComponent(player);

		print(`Constructing ${componentClass} for ${player.Name}...`);

		const playerComponent = this.components.addComponent(player, componentClass);
		this.playerComponents.set(player.UserId, playerComponent);

		Events.SetCharacterType.fire(player, playerComponent.characterType);

		if (loadCharacter) player.LoadCharacter();

		print(`${componentClass} constructed for ${player.Name}`);

		return playerComponent;
	}

	public destroyPlayerComponent(player: Player): void {
		const playerComponent = this.getPlayerComponent(player, PlayerComponent);
		if (!playerComponent) return;

		if (playerComponent instanceof GamePlayerComponent) {
			this.components.removeComponent<GamePlayerComponent>(player);
		} else if (playerComponent instanceof LobbyPlayerComponent) {
			this.components.removeComponent<LobbyPlayerComponent>(player);
		}
		this.playerComponents.delete(player.UserId);
	}

	public deactivateAllPlayers(): void {
		Players.GetPlayers().forEach((player) => {
			this.destroyPlayerComponent(player);
			Events.SetCharacterType.fire(player, CharacterType.None);

			if (!player.Character) return;
			player.Character.GetChildren()
				.filter((child) => child.IsA("BasePart"))
				.forEach((child) => (child.Anchored = true));
			player.Character.PivotTo(new CFrame(0, -1000, 0));
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
		this.setPlayerComponent(player, LobbyPlayerComponent, false);
		this.kickOffenses.set(player.UserId, 0);
	}
	private onPlayerRemoving(player: Player): void {
		this.destroyPlayerComponent(player);
		this.kickOffenses.delete(player.UserId);
	}
}

export default PlayerRegistry;
