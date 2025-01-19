import { BaseComponent, Component } from "@flamework/components";
import { OnStart } from "@flamework/core";
import { Players } from "@rbxts/services";
import { Events } from "server/network";
import { TWCharacterInstance } from "shared/types/characterTypes";
import { ToolInstance, ToolType } from "shared/types/toolTypes";
import { isR6Character, isToolInstance } from "shared/types/typeGuards";
import { findFirstChildWithTag } from "shared/utility";

@Component()
export class TWPlayerComponent extends BaseComponent<{}, Player> implements OnStart {
	public get isAlive(): boolean {
		return this._isAlive;
	}
	private set isAlive(value: boolean) {
		this._isAlive = value;
	}

	private _isAlive: boolean = false;

	private character?: TWCharacterInstance;
	private backpack?: Backpack;

	private tools: Partial<Record<ToolType, ToolInstance>> = {};
	private curTool?: ToolInstance;

	public onStart(): void {
		this.instance.CharacterAdded.Connect((character) => this.onCharacterAdded(character));
		this.instance.CharacterRemoving.Connect(() => this.onCharacterRemoving());
		this.instance.CharacterAppearanceLoaded.Connect(() => this.onCharacterAppearanceLoaded());
	}

	public tiltCharacter(angle: number): void {
		if (!this.isAlive) {
			warn(`${this.instance.Name} is not alive`);
			return;
		}

		if (!this.character) {
			warn(`${this.instance.Name} does not have a character`);
			return;
		}

		Events.CharacterTiltChanged.fire(this.getOtherPlayers(), this.character, angle);
	}

	public equipTool(toolType: ToolType): void {
		if (!this.isAlive) {
			warn(`${this.instance.Name} is not alive`);
			return;
		}

		if (!this.character) {
			warn(`${this.instance.Name} does not have a character`);
			return;
		}

		const tool = this.tools[toolType];
		if (!tool) {
			warn(`${this.instance.Name} does not have a valid ${toolType}`);
			return;
		}

		if (this.curTool) {
			this.curTool.Parent = this.backpack;
		}

		this.curTool = tool;
		this.character.Torso.ToolJoint.Part1 = this.curTool.PrimaryPart;
		this.curTool.Parent = this.character;

		Events.CharacterTiltChanged.fire(this.getOtherPlayers(), this.character);
	}

	public unequip(): void {
		if (!this.curTool) {
			return;
		}

		if (!this.character) {
			warn(`${this.instance.Name} does not have a character`);
			return;
		}

		this.curTool.Parent = this.backpack;
		this.character.Torso.ToolJoint.Part1 = undefined;
		this.curTool = undefined;
	}

	private getOtherPlayers(): Player[] {
		return Players.GetPlayers().filter((player) => player !== this.instance);
	}

	private onCharacterAdded(character: Model): void {
		if (!isR6Character(character)) {
			warn(`${this.instance.Name} is not an R6 character`);
			return;
		}

		character.PrimaryPart = character.HumanoidRootPart;

		const toolJoint = new Instance("Motor6D");
		toolJoint.Name = "ToolJoint";
		toolJoint.Part0 = character.Torso;
		toolJoint.Parent = character.Torso;

		this.character = character as TWCharacterInstance;

		this.isAlive = true;

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
