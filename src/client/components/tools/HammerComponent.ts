import { Component } from "@flamework/components";
import { ToolComponent } from "./ToolComponent";

@Component()
export class HammerComponent extends ToolComponent {
	public override usePrimaryAction(toActivate: boolean): void {
		print(toActivate ? "Destroying block" : "Stopping destruction");
	}

	public override useSecondaryAction(toActivate: boolean): void {
		print(toActivate ? "Placing block" : "Stopping placement");
	}
}
