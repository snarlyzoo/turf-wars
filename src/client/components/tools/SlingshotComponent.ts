import { Component } from "@flamework/components";
import { ToolComponent } from "./ToolComponent";

@Component()
export class SlingshotComponent extends ToolComponent {
	public override onStart(): void {
		super.onStart();
		this.mouseIcon = "rbxassetid://textures/GunCursor.png";
	}

	public override usePrimaryAction(toActivate: boolean): void {
		if (!this.twCharacter.combatEnabled) {
			return;
		}

		print(toActivate ? "Pulling back slingshot" : "Releasing slingshot");
	}
}
