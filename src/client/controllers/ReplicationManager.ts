import { Components } from "@flamework/components";
import { Controller, OnStart } from "@flamework/core";
import { TiltCharacterComponent } from "client/components/characters";
import { Events } from "client/network";
import { TWCharacterInstance } from "shared/types/characterTypes";

@Controller()
class ReplicationManager implements OnStart {
	private tiltCharacterMap = new Map<TWCharacterInstance, TiltCharacterComponent>();

	public constructor(private components: Components) {}

	public onStart(): void {
		Events.CharacterTiltChanged.connect((character, angle) => this.onCharacterTiltChanged(character, angle));
	}

	private onCharacterTiltChanged(character: TWCharacterInstance, angle?: number): void {
		let tiltCharacter = this.tiltCharacterMap.get(character);
		if (!tiltCharacter) {
			tiltCharacter = this.components.addComponent<TiltCharacterComponent>(character);
			this.tiltCharacterMap.set(character, tiltCharacter);

			character.Destroying.Connect(() => {
				this.components.removeComponent<TiltCharacterComponent>(character);
				this.tiltCharacterMap.delete(character);
			});
		}
		tiltCharacter.update(angle);
	}
}
