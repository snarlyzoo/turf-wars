import { Components } from "@flamework/components";
import { Flamework, OnStart, Service } from "@flamework/core";
import { Players } from "@rbxts/services";
import { TWPlayerComponent } from "server/components";
import { Events } from "server/network";
import { TWCharacterInstance } from "shared/types";

const isTWCharacter = Flamework.createGuard<TWCharacterInstance>();

@Service()
class RemoteHandler implements OnStart {
	public constructor(private components: Components) {}

	public onStart(): void {
		Events.UpdateCharacterTilt.connect((player, tilt) => this.onUpdateCharacterTilt(player, tilt));
	}

	private onUpdateCharacterTilt(player: Player, angle: number): void {
		const twPlayer = this.components.getComponent<TWPlayerComponent>(player);
		if (!twPlayer) {
			warn(`${player.Name} does not have a turf war player component`);
			return;
		}

		if (!twPlayer.isAlive) {
			warn(`${player.Name} is not alive`);
			return;
		}

		const character = player.Character;
		if (!isTWCharacter(character)) {
			warn(`${player.Name} is not a turf war character`);
			return;
		}

		Events.CharacterTiltChanged.fire(
			Players.GetPlayers().filter((p) => p !== player),
			character,
			angle,
		);
	}
}
