import { Component } from "@flamework/components";
import { ToolComponent } from "./ToolComponent";

@Component()
export class HammerComponent extends ToolComponent {
	public usePrimaryAction(toActivate: boolean): void {
		print(toActivate ? "Destroying block" : "Stopping destruction");
	}

	public useSecondaryAction(toActivate: boolean): void {
		print(toActivate ? "Placing block" : "Stopping placement");
	}
}
