import { Components } from "@flamework/components";
import { Controller, OnStart } from "@flamework/core";
import { Players } from "@rbxts/services";
import { TWCharacterComponent } from "client/components/characters";

const player = Players.LocalPlayer;

@Controller()
export class CharacterController implements OnStart {
	private character?: Model;

	public constructor(private components: Components) {}

	public onStart(): void {
		player.CharacterAdded.Connect((character) => this.onCharacterAdded(character));
		player.CharacterRemoving.Connect(() => this.onCharacterRemoving());
	}

	private onCharacterAdded(character: Model): void {
		this.character = character;

		print("Constructing character component...");

		this.components.addComponent<TWCharacterComponent>(this.character);

		print("Character component constructed.");
	}

	private onCharacterRemoving(): void {
		if (this.character) {
			this.components.removeComponent<TWCharacterComponent>(this.character);
		}
	}
}
