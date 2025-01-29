import { OnStart, Service } from "@flamework/core";
import { PlayerComponent, GamePlayerComponent } from "server/components/players";
import { Events, Functions } from "server/network";
import { PlayerRegistry } from "server/services";
import { BlockActionService, ProjectileActionService } from ".";

@Service()
class RemoteHandler implements OnStart {
	public constructor(
		private playerRegistry: PlayerRegistry,
		private blockActionService: BlockActionService,
		private projectileActionService: ProjectileActionService,
	) {}

	public onStart(): void {
		Events.UpdateCharacterTilt.connect((player, angle) =>
			this.usePlayerComponent(player, "UpdateCharacterTilt", (playerComponent) =>
				playerComponent.updateTilt(angle),
			),
		);

		Events.EquipTool.connect((player, toolType) =>
			this.useGamePlayer(player, "EquipTool", (gamePlayer) => gamePlayer.equipTool(toolType)),
		);
		Events.UnequipCurrentTool.connect((player) =>
			this.useGamePlayer(player, "UnequipCurrentTool", (gamePlayer) => gamePlayer.unequip()),
		);

		Events.FireProjectile.connect((player, origin, direction, speed, timestamp) =>
			this.useGamePlayer(player, "FireProjectile", (gamePlayer) =>
				this.projectileActionService.handleFireProjectile(gamePlayer, origin, direction, speed, timestamp),
			),
		);
		Events.RegisterProjectileHit.connect((player, hitType, hitPart, hitTimestamp, firedTimestamp) =>
			this.useGamePlayer(player, "RegisterProjectileHit", (gamePlayer) =>
				this.projectileActionService.handleRegisterProjectileHit(
					gamePlayer,
					hitType,
					hitPart,
					hitTimestamp,
					firedTimestamp,
				),
			),
		);

		Events.DamageBlock.connect((player, block) =>
			this.useGamePlayer(player, "DamageBlock", (gamePlayer) =>
				this.blockActionService.handleDamageBlock(gamePlayer, block),
			),
		);
		Functions.PlaceBlock.setCallback(
			(player, position) =>
				this.useGamePlayer(player, "PlaceBlock", (gamePlayer) =>
					this.blockActionService.handlePlaceBlock(gamePlayer, position),
				) ?? false,
		);
	}

	private usePlayerComponent<T>(
		player: Player,
		remoteName: string,
		callback: (playerComponent: PlayerComponent) => T,
	): T | undefined {
		const playerComponent = this.playerRegistry.getPlayerComponent(player);
		if (!playerComponent) {
			warn(`${player.Name} fired ${remoteName} without a player component`);
			return;
		}
		return callback(playerComponent);
	}

	private useGamePlayer<T>(
		player: Player,
		remoteName: string,
		callback: (gamePlayer: GamePlayerComponent) => T,
	): T | undefined {
		return this.usePlayerComponent(player, remoteName, (playerComponent) => {
			if (!(playerComponent instanceof GamePlayerComponent)) {
				warn(`${player.Name} fired ${remoteName} without a game player component`);
				return;
			}
			return callback(playerComponent);
		});
	}
}
