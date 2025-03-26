import { Component } from "@flamework/components";
import { Flamework, OnTick } from "@flamework/core";
import { ReplicatedStorage } from "@rbxts/services";
import { TurfService } from "server/services";
import { Events } from "server/network";
import { HammerConfig, SlingshotConfig, ToolInstance, ToolType } from "shared/types/toolTypes";
import { ProjectileRecord } from "shared/types/projectileTypes";
import { CharacterType, R15CharacterInstance, R6CharacterInstance } from "shared/types/characterTypes";
import { findFirstChildWithTag, getHammerConfig, getSlingshotConfig } from "shared/utility";
import { BlockGrid } from "shared/modules";
import PlayerComponent from "./PlayerComponent";

type ToolConfigMap = {
	[ToolType.Slingshot]: SlingshotConfig;
	[ToolType.Hammer]: HammerConfig;
};

@Component()
class GamePlayerComponent extends PlayerComponent implements OnTick {
	public override characterType = CharacterType.Game;

	private readonly TURF_KICK_COOLDOWN = 0.5;

	private readonly isToolInstance = Flamework.createGuard<ToolInstance>();

	public get blockCount(): number {
		return this._blockCount;
	}
	public set blockCount(value: number) {
		this._blockCount = value;
	}
	private _blockCount: number = 0;
	public lastDamageBlockTick: number = 0;

	// TODO: Find a better way to reference these objects
	public blockPrefab = ReplicatedStorage.FindFirstChild("Block") as BasePart;

	public get projectileCount(): number {
		return this._projectileCount;
	}
	public set projectileCount(value: number) {
		this._projectileCount = value;
	}
	private _projectileCount: number = 0;
	public lastFireProjectileTick: number = 0;

	public get projectileRecords(): Map<number, ProjectileRecord> {
		return this._projectileRecords;
	}
	private _projectileRecords: Map<number, ProjectileRecord> = new Map();

	public projectilePrefab = ReplicatedStorage.FindFirstChild("Projectile") as PVInstance;

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

		this.unequip();

		this.curTool = newTool;
		toolJoint.Part1 = this.curTool.PrimaryPart;
		this.curTool.Parent = this.character;

		this.updateTilt();
	}

	public unequip(): void {
		if (!this.curTool) return;

		this.curTool.Parent = this.backpack;
		this.curTool = undefined;
	}

	public giveResources(blockCount?: number, projectileCount?: number): void {
		this.blockCount += blockCount ?? 0;
		this.projectileCount += projectileCount ?? 0;
		Events.UpdateResources.fire(this.instance, this.blockCount, this.projectileCount);
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

		if (!BlockGrid.isOnCorrectSide(this.character.GetPivot().Position, this.team)) {
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

		this.unequip();

		this.tools = {};
		this.toolConfigs = {};
	}
}

export default GamePlayerComponent;
