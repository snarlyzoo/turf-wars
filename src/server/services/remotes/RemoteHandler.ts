import { OnStart, Service } from "@flamework/core";
import { TWPlayerComponent } from "server/components";
import { Events } from "server/network";
import { PlayerRegistry } from "server/services/PlayerRegistry";
import { CharacterActionService, SlingshotActionService } from ".";

@Service()
class RemoteHandler implements OnStart {
	public constructor(
		private playerRegistry: PlayerRegistry,
		private characterActionService: CharacterActionService,
		private slingshotActionService: SlingshotActionService,
	) {}

	public onStart(): void {
		Events.UpdateCharacterTilt.connect((player, angle) =>
			this.useTWPlayer(player, (twPlayer) =>
				this.characterActionService.handleUpdateCharacterTilt(twPlayer, angle),
			),
		);

		Events.EquipTool.connect((player, toolType) =>
			this.useTWPlayer(player, (twPlayer) => this.characterActionService.handleEquipTool(twPlayer, toolType)),
		);
		Events.UnequipCurrentTool.connect((player) =>
			this.useTWPlayer(player, (twPlayer) => this.characterActionService.handleUnequipCurrentTool(twPlayer)),
		);

		Events.FireProjectile.connect((player, origin, direction, speed, timestamp) =>
			this.useTWPlayer(player, (twPlayer) =>
				this.slingshotActionService.handleFireProjectile(twPlayer, origin, direction, speed, timestamp),
			),
		);
		Events.RegisterProjectileHit.connect((player, hitType, hitPart, hitTimestamp, firedTimestamp) =>
			this.useTWPlayer(player, (twPlayer) =>
				this.slingshotActionService.handleRegisterProjectileHit(
					twPlayer,
					hitType,
					hitPart,
					hitTimestamp,
					firedTimestamp,
				),
			),
		);
	}

	private useTWPlayer(player: Player, callback: (twPlayer: TWPlayerComponent) => void): void {
		const twPlayer = this.playerRegistry.getTWPlayer(player);
		if (!twPlayer) {
			warn(`${player.Name} does not have a turf war player component`);
			return;
		}
		callback(twPlayer);
	}
}
