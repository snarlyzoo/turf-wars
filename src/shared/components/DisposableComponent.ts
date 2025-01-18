import { BaseComponent } from "@flamework/components";
import { Janitor } from "@rbxts/janitor";

export class DisposableComponent<A = {}, I extends Instance = Instance> extends BaseComponent<A, I> {
	protected janitor: Janitor = new Janitor();

	public override destroy(): void {
		this.janitor.Cleanup();
		super.destroy();
	}
}
