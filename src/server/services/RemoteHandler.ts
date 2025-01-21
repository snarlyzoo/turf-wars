import { OnStart, Service } from "@flamework/core";
import { Events } from "server/network";
import { PlayerRegistry } from "./PlayerRegistry";
import { TWPlayerComponent } from "server/components";

@Service()
class RemoteHandler implements OnStart {
	public constructor(private playerRegistry: PlayerRegistry) {}

	public onStart(): void {
		Events.UpdateCharacterTilt.connect((player, tilt) =>
			this.useTWPlayer(player, (twPlayer) => twPlayer.tiltCharacter(tilt)),
		);

		Events.EquipTool.connect((player, toolType) =>
			this.useTWPlayer(player, (twPlayer) => twPlayer.equipTool(toolType)),
		);
		Events.UnequipCurrentTool.connect((player) => this.useTWPlayer(player, (twPlayer) => twPlayer.unequip()));

		Events.FireProjectile.connect((player, origin, direction, speed, timestamp) =>
			this.useTWPlayer(player, (twPlayer) => twPlayer.fireProjectile(origin, direction, speed, timestamp)),
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
