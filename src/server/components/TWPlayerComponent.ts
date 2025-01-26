import { BaseComponent, Component } from "@flamework/components";
import { Flamework, OnStart } from "@flamework/core";
import { ProjectileRecord } from "shared/projectiles";
import { HumanoidCharacterInstance, R15CharacterInstance, R6CharacterInstance } from "shared/types/characterTypes";
import { ToolInstance, ToolType } from "shared/types/toolTypes";
import { findFirstChildWithTag } from "shared/utility";

@Component()
export class TWPlayerComponent extends BaseComponent<{}, Player> implements OnStart {
	private readonly isHumanoidCharacter = Flamework.createGuard<HumanoidCharacterInstance>();
	private readonly isToolInstance = Flamework.createGuard<ToolInstance>();

	public get isAlive(): boolean {
		return this._isAlive;
	}
	private set isAlive(value: boolean) {
		this._isAlive = value;
	}

	public get combatEnabled(): boolean {
		return this._combatEnabled;
	}
	public set combatEnabled(value: boolean) {
		this._combatEnabled = value;
	}

	public get lastFireProjectileTick(): number {
		return this._lastFireProjectileTick;
	}
	public set lastFireProjectileTick(value: number) {
		this._lastFireProjectileTick = value;
	}

	public get projectileRecords(): Map<number, ProjectileRecord> {
		return this._projectileRecords;
	}

	private _isAlive: boolean = false;
	private _combatEnabled: boolean = false;

	private _lastFireProjectileTick: number = 0;
	private _projectileRecords: Map<number, ProjectileRecord> = new Map();

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

	public getBackpack(): Backpack | undefined {
		return this.backpack;
	}

	public getCharacter(): HumanoidCharacterInstance | undefined {
		return this.character;
	}

	public getToolJoint(): Motor6D | undefined {
		return this.toolJoint;
	}

	public getTool(toolType: ToolType): ToolInstance | undefined {
		return this.tools[toolType];
	}

	public getCurrentTool(): ToolInstance | undefined {
		return this.curTool;
	}
	public setCurrentTool(tool?: ToolInstance): void {
		this.curTool = tool;
	}

	private onCharacterAdded(character: Model): void {
		if (!this.isHumanoidCharacter(character)) {
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
		this.combatEnabled = true;

		const hammer = findFirstChildWithTag(this.backpack, ToolType.Hammer);
		const slingshot = findFirstChildWithTag(this.backpack, ToolType.Slingshot);
		if (!(hammer && this.isToolInstance(hammer)) || !(slingshot && this.isToolInstance(slingshot))) {
			warn(`${this.instance.Name} does not have a valid hammer or slingshot`);
			return;
		}
		this.tools[ToolType.Hammer] = hammer;
		this.tools[ToolType.Slingshot] = slingshot;
	}

	private onCharacterRemoving(): void {
		if (this.isAlive) this.onDied();
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
		this.combatEnabled = false;
		this.tools = {};
	}
}
