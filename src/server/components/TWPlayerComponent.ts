import { BaseComponent, Component } from "@flamework/components";
import { Flamework, OnStart } from "@flamework/core";
import { Players } from "@rbxts/services";
import { Events } from "server/network";
import { HumanoidCharacterInstance, R15CharacterInstance, R6CharacterInstance } from "shared/types/characterTypes";
import { ToolInstance, ToolType } from "shared/types/toolTypes";
import { findFirstChildWithTag } from "shared/utility";

const isHumanoidCharacter = Flamework.createGuard<HumanoidCharacterInstance>();
const isToolInstance = Flamework.createGuard<ToolInstance>();

@Component()
export class TWPlayerComponent extends BaseComponent<{}, Player> implements OnStart {
	public get isAlive(): boolean {
		return this._isAlive;
	}
	private set isAlive(value: boolean) {
		this._isAlive = value;
	}

	private _isAlive: boolean = false;

	private backpack?: Backpack;
	private character?: HumanoidCharacterInstance;
	private toolJoint?: Motor6D;

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

		if (!this.character || !this.toolJoint) {
			warn(`${this.instance.Name} does not have a character or tool joint`);
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
		this.toolJoint.Part1 = this.curTool.PrimaryPart;
		this.curTool.Parent = this.character;

		Events.CharacterTiltChanged.fire(this.getOtherPlayers(), this.character);
	}

	public unequip(): void {
		if (!this.curTool) {
			return;
		}

		if (!this.character || !this.toolJoint) {
			warn(`${this.instance.Name} does not have a character or tool joint`);
			return;
		}

		this.curTool.Parent = this.backpack;
		this.toolJoint.Part1 = undefined;
		this.curTool = undefined;

		Events.CharacterTiltChanged.fire(this.getOtherPlayers(), this.character);
	}

	private getOtherPlayers(): Player[] {
		return Players.GetPlayers().filter((player) => player !== this.instance);
	}

	private onCharacterAdded(character: Model): void {
		if (!isHumanoidCharacter(character)) {
			warn(`${this.instance.Name} does not have a humanoid character`);
			return;
		}
		this.character = character;
		this.character.PrimaryPart = this.character.HumanoidRootPart;

		this.backpack = this.instance.FindFirstChildOfClass("Backpack");
		if (!this.backpack) {
			warn(`${this.instance.Name} does not have a backpack`);
			return;
		}

		this.toolJoint = new Instance("Motor6D");
		this.toolJoint.Name = "ToolJoint";
		this.toolJoint.Part0 =
			this.character.Humanoid.RigType === Enum.HumanoidRigType.R6
				? (this.character as R6CharacterInstance).Torso
				: (this.character as R15CharacterInstance).UpperTorso;
		this.toolJoint.Parent = this.toolJoint.Part0;

		this.isAlive = true;

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

		this.tools = {};
	}
}
