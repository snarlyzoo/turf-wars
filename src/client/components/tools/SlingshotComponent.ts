import { Component } from "@flamework/components";
import { ToolComponent } from "./ToolComponent";
import { TWCharacterComponent, ViewmodelComponent } from "../characters";

@Component()
export class SlingshotComponent extends ToolComponent {
	public override initialize(twCharacter: TWCharacterComponent, viewmodel: ViewmodelComponent): void {
		super.initialize(twCharacter, viewmodel);
		this.mouseIcon = "rbxassetid://textures/GunCursor.png";
	}

	public override usePrimaryAction(toActivate: boolean): void {
		if (!this.twCharacter.combatEnabled) {
			return;
		}

		print(toActivate ? "Pulling back slingshot" : "Releasing slingshot");
	}
}
