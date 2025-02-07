import { Component } from "@flamework/components";
import { PlayerComponent } from "./PlayerComponent";
import { Flamework, OnTick } from "@flamework/core";
import { HammerConfig, SlingshotConfig, ToolInstance, ToolType } from "shared/types/toolTypes";
import { ProjectileRecord } from "shared/types/projectileTypes";
import { CharacterType, R15CharacterInstance, R6CharacterInstance } from "shared/types/characterTypes";
import { findFirstChildWithTag, getHammerConfig, getSlingshotConfig } from "shared/utility";
import { TurfService } from "server/services";

type ToolConfigMap = {
	[ToolType.Slingshot]: SlingshotConfig;
	[ToolType.Hammer]: HammerConfig;
};

@Component()
export class GamePlayerComponent extends PlayerComponent implements OnTick {
	private readonly TURF_KICK_COOLDOWN = 0.5;

	private readonly isToolInstance = Flamework.createGuard<ToolInstance>();

	protected override characterType = CharacterType.Game;

	public combatEnabled: boolean = false;

	public lastDamageBlockTick: number = 0;
	public lastFireProjectileTick: number = 0;

	public get projectileRecords(): Map<number, ProjectileRecord> {
		return this._projectileRecords;
	}
	private _projectileRecords: Map<number, ProjectileRecord> = new Map();

	private lastTurfKickTick: number = 0;

	private toolJoint?: Motor6D;

	private tools: Partial<Record<ToolType, ToolInstance>> = {};
	private toolConfigs: Partial<ToolConfigMap> = {};
	private curTool?: ToolInstance;

	public constructor(private turfService: TurfService) {
		super();
	}

	public override onStart(): void {
		super.onStart();
		this.instance.CharacterAppearanceLoaded.Connect(() => this.onCharacterAppearanceLoaded());
	}

	public onTick(): void {
		this.enforceTurfBoundaries();
	}

	public getToolJoint(): Motor6D | undefined {
		return this.toolJoint;
	}

	public getTool(toolType: ToolType): ToolInstance | undefined {
		return this.tools[toolType];
	}

	public getToolConfig<T extends ToolType>(toolType: T): ToolConfigMap[T] | undefined {
		return this.toolConfigs[toolType];
	}

	public getCurrentTool(): ToolInstance | undefined {
		return this.curTool;
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

		const newTool = this.getTool(toolType);
		if (!newTool) {
			warn(`${this.instance.Name} does not have a ${toolType}`);
			return;
		}

		const toolJoint = this.getToolJoint();
		if (!toolJoint) {
			warn(`${this.instance.Name} does not have a tool joint`);
			return;
		}

		if (this.curTool) {
			this.curTool.Parent = this.backpack;
		}

		toolJoint.Part1 = newTool.PrimaryPart;
		newTool.Parent = this.character;

		this.curTool = newTool;

		this.updateTilt();
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

		this.toolConfigs[ToolType.Slingshot] = getSlingshotConfig(slingshot.FindFirstChildOfClass("Configuration"));
		this.toolConfigs[ToolType.Hammer] = getHammerConfig(hammer.FindFirstChildOfClass("Configuration"));
	}

	private enforceTurfBoundaries(): void {
		if (!this.isAlive || !this.character) return;

		const tick = os.clock();
		if (tick - this.lastTurfKickTick < this.TURF_KICK_COOLDOWN) return;

		if (!this.turfService.isOnCorrectSide(this.character.GetPivot().Position, this.team)) {
			this.turfService.kickCharacterBackToTurf(this.character, this.team);
			this.lastTurfKickTick = tick;
		}
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
