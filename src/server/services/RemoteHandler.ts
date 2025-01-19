import { OnStart, Service } from "@flamework/core";
import { Events } from "server/network";
import { PlayerService } from "./PlayerService";
import { TWPlayerComponent } from "server/components";

@Service()
class RemoteHandler implements OnStart {
	public constructor(private playerService: PlayerService) {}

	public onStart(): void {
		Events.UpdateCharacterTilt.connect((player, tilt) =>
			this.useTWPlayer(player, (twPlayer) => twPlayer.tiltCharacter(tilt)),
		);

		Events.EquipTool.connect((player, toolType) =>
			this.useTWPlayer(player, (twPlayer) => twPlayer.equipTool(toolType)),
		);
		Events.UnequipCurrentTool.connect((player) => this.useTWPlayer(player, (twPlayer) => twPlayer.unequip()));
	}

	private useTWPlayer(player: Player, callback: (twPlayer: TWPlayerComponent) => void): void {
		const twPlayer = this.playerService.getTWPlayer(player);
		if (!twPlayer) {
			warn(`${player.Name} does not have a turf war player component`);
			return;
		}
		callback(twPlayer);
	}
}
