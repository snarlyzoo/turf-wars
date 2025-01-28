import { OnStart, Service } from "@flamework/core";
import { PlayerComponent, GamePlayerComponent } from "server/components/players";
import { Events } from "server/network";
import { PlayerRegistry } from "server/services";
import { CharacterActionService, ProjectileService } from ".";

@Service()
class RemoteHandler implements OnStart {
	public constructor(
		private playerRegistry: PlayerRegistry,
		private characterActionService: CharacterActionService,
		private projectileService: ProjectileService,
	) {}

	public onStart(): void {
		Events.UpdateCharacterTilt.connect((player, angle) =>
			this.usePlayerComponent(player, (playerComponent) =>
				this.characterActionService.handleUpdateCharacterTilt(playerComponent, angle),
			),
		);

		Events.EquipTool.connect((player, toolType) =>
			this.useGamePlayer(player, (gamePlayer) =>
				this.characterActionService.handleEquipTool(gamePlayer, toolType),
			),
		);
		Events.UnequipCurrentTool.connect((player) =>
			this.useGamePlayer(player, (gamePlayer) =>
				this.characterActionService.handleUnequipCurrentTool(gamePlayer),
			),
		);

		Events.FireProjectile.connect((player, origin, direction, speed, timestamp) =>
			this.useGamePlayer(player, (gamePlayer) =>
				this.projectileService.handleFireProjectile(gamePlayer, origin, direction, speed, timestamp),
			),
		);
		Events.RegisterProjectileHit.connect((player, hitType, hitPart, hitTimestamp, firedTimestamp) =>
			this.useGamePlayer(player, (gamePlayer) =>
				this.projectileService.handleRegisterProjectileHit(
					gamePlayer,
					hitType,
					hitPart,
					hitTimestamp,
					firedTimestamp,
				),
			),
		);
	}

	private usePlayerComponent(player: Player, callback: (playerComponent: PlayerComponent) => void): void {
		const playerComponent = this.playerRegistry.getPlayerComponent(player);
		if (!playerComponent) {
			warn(`${player.Name} does not have a player component`);
			return;
		}
		callback(playerComponent);
	}

	private useGamePlayer(player: Player, callback: (gamePlayer: GamePlayerComponent) => void): void {
		const playerComponent = this.playerRegistry.getPlayerComponent(player);
		if (!(playerComponent instanceof GamePlayerComponent)) {
			warn(`${player.Name} does not have a game player component`);
			return;
		}
		callback(playerComponent);
	}
}
