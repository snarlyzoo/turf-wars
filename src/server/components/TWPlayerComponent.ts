import { Component } from "@flamework/components";
import { Flamework, OnStart } from "@flamework/core";
import { DisposableComponent } from "shared/components";
import { R6CharacterInstance, ToolInstance, ToolType } from "shared/types";
import { findFirstChildWithTag } from "shared/utility";

const isR6Character = Flamework.createGuard<R6CharacterInstance>();
const isToolInstance = Flamework.createGuard<ToolInstance>();

@Component()
export class TWPlayerComponent extends DisposableComponent<{}, Player> implements OnStart {
	public get isAlive(): boolean {
		return this._isAlive;
	}
	private set isAlive(value: boolean) {
		this._isAlive = value;
	}

	private _isAlive: boolean = false;

	private character?: R6CharacterInstance;
	private backpack?: Backpack;

	private tools: Partial<Record<ToolType, ToolInstance>> = {};

	public onStart(): void {
		this.janitor.Add(this.instance.CharacterAdded.Connect((character) => this.onCharacterAdded(character)));
		this.janitor.Add(this.instance.CharacterRemoving.Connect(() => this.onCharacterRemoving()));
		this.janitor.Add(this.instance.CharacterAppearanceLoaded.Connect(() => this.onCharacterAppearanceLoaded()));
	}

	private onCharacterAdded(character: Model): void {
		if (!isR6Character(character)) {
			warn(`${this.instance.Name} is not an R6 character`);
			return;
		}

		this.character = character;
		this.character.PrimaryPart = this.character.HumanoidRootPart;

		const toolJoint = new Instance("Motor6D");
		toolJoint.Name = "ToolJoint";
		toolJoint.Part0 = this.character.Torso;
		toolJoint.Parent = this.character.Torso;

		this.backpack = this.instance.FindFirstChildOfClass("Backpack");
		if (!this.backpack) {
			warn(`${this.instance.Name} does not have a backpack`);
			return;
		}

		const hammer = findFirstChildWithTag(this.backpack, ToolType.Hammer);
		const slingshot = findFirstChildWithTag(this.backpack, ToolType.Slingshot);
		if (!(hammer && isToolInstance(hammer)) || !(slingshot && isToolInstance(slingshot))) {
			warn(`${this.instance.Name} does not have a valid hammer or slingshot`);
			return;
		}
		this.tools[ToolType.Hammer] = hammer;
		this.tools[ToolType.Slingshot] = slingshot;

		this.isAlive = true;
	}

	private onCharacterRemoving(): void {
		if (this.isAlive) {
			this.onDied();
		}
	}

	private onCharacterAppearanceLoaded(): void {
		if (!this.character) {
			warn(`${this.instance.Name} does not have a character`);
			return;
		}

		for (const instance of this.character.GetChildren()) {
			if (instance.IsA("Accessory")) {
				const handle = instance.FindFirstChild("Handle") as BasePart;
				if (handle) {
					handle.CanQuery = false;
				}
			}
		}
	}

	private onDied(): void {
		this.isAlive = false;
	}
}
