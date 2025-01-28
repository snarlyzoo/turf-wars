import { Component } from "@flamework/components";
import { PlayerComponent } from "./PlayerComponent";
import { Flamework } from "@flamework/core";
import { SlingshotConfig, ToolInstance, ToolType } from "shared/types/toolTypes";
import { ProjectileRecord } from "shared/types/projectileTypes";
import { CharacterType, R15CharacterInstance, R6CharacterInstance } from "shared/types/characterTypes";
import { findFirstChildWithTag } from "shared/utility";
import { getSlingshotConfig } from "shared/utility/getConfig";

type ToolConfigMap = {
	[ToolType.Slingshot]: SlingshotConfig;
	[ToolType.Hammer]: undefined;
};

@Component()
export class GamePlayerComponent extends PlayerComponent {
	protected override characterType = CharacterType.Game;

	private readonly isToolInstance = Flamework.createGuard<ToolInstance>();

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

	private _combatEnabled: boolean = false;

	private _lastFireProjectileTick: number = 0;
	private _projectileRecords: Map<number, ProjectileRecord> = new Map();

	private toolJoint?: Motor6D;

	private tools: Partial<Record<ToolType, ToolInstance>> = {};
	private toolConfigs: Partial<ToolConfigMap> = {};
	private curTool?: ToolInstance;

	public override onStart(): void {
		super.onStart();
		this.instance.CharacterAppearanceLoaded.Connect(() => this.onCharacterAppearanceLoaded());
	}

	public getToolJoint(): Motor6D | undefined {
		if (!this.toolJoint) {
			warn(`${this.instance.Name} does not have a tool joint`);
		}
		return this.toolJoint;
	}

	public getTool(toolType: ToolType): ToolInstance | undefined {
		if (!this.tools[toolType]) {
			warn(`${this.instance.Name} does not have a ${toolType}`);
		}
		return this.tools[toolType];
	}

	public getToolConfig(toolType: ToolType): ToolConfigMap[ToolType] | undefined {
		if (!this.toolConfigs[toolType]) {
			warn(`${this.instance.Name} does not have a ${toolType} config`);
		}
		return this.toolConfigs[toolType];
	}

	public getCurrentTool(): ToolInstance | undefined {
		return this.curTool;
	}
	public setCurrentTool(tool?: ToolInstance): void {
		this.curTool = tool;
	}

	private createToolJoint(): void {
		if (!this.character) {
			warn(`${this.instance.Name} does not have a character`);
			return;
		}

		this.toolJoint = new Instance("Motor6D");
		this.toolJoint.Name = "ToolJoint";
		this.toolJoint.Part0 =
			this.character.Humanoid.RigType === Enum.HumanoidRigType.R6
				? (this.character as R6CharacterInstance).Torso
				: (this.character as R15CharacterInstance).UpperTorso;
		this.toolJoint.Parent = this.toolJoint.Part0;
	}

	private fetchTools(): void {
		if (!this.backpack) {
			warn(`${this.instance.Name} does not have a backpack`);
			return;
		}

		const hammer = findFirstChildWithTag(this.backpack, ToolType.Hammer);
		const slingshot = findFirstChildWithTag(this.backpack, ToolType.Slingshot);
		if (!(hammer && this.isToolInstance(hammer)) || !(slingshot && this.isToolInstance(slingshot))) {
			warn(`${this.instance.Name} does not have a hammer or slingshot`);
			return;
		}
		this.tools[ToolType.Hammer] = hammer;
		this.tools[ToolType.Slingshot] = slingshot;

		this.toolConfigs[ToolType.Slingshot] = getSlingshotConfig(slingshot.Configuration);
	}

	protected override onCharacterAdded(character: Model): void {
		super.onCharacterAdded(character);

		this.createToolJoint();
		this.fetchTools();
	}

	private onCharacterAppearanceLoaded(): void {
		if (!this.character) return;

		this.character.GetChildren().forEach((child) => {
			if (child.IsA("Accessory")) {
				const handle = child.FindFirstChild("Handle");
				if (handle && handle.IsA("BasePart")) {
					handle.CanQuery = false;
				}
			}
		});
	}

	protected override onDied(): void {
		super.onDied();
		this.combatEnabled = false;

		this.tools = {};
		this.toolConfigs = {};
	}
}
