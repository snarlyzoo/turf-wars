import { Component } from "@flamework/components";
import { OnRender } from "@flamework/core";
import Object from "@rbxts/object-utils";
import { RunService } from "@rbxts/services";
import { ViewmodelComponent } from "client/components/characters/addons";
import { HammerComponent, SlingshotComponent, ToolComponent } from "client/components/tools";
import { Events } from "client/network";
import { R15GameCharacterInstance, R6GameCharacterInstance } from "shared/types/characterTypes";
import { ToolType } from "shared/types/toolTypes";
import { findFirstChildWithTag } from "shared/utility";
import { CharacterComponent } from "./CharacterComponent";

@Component()
export class GameCharacterComponent extends CharacterComponent implements OnRender {
	protected override CAMERA_MODE = Enum.CameraMode.LockFirstPerson;

	public get combatEnabled(): boolean {
		return this._combatEnabled;
	}
	public set combatEnabled(value: boolean) {
		print(`Combat enabled: ${value}`);
		this._combatEnabled = value;
	}

	private _combatEnabled: boolean = false;

	private toolJoint!: Motor6D;

	private viewmodel!: ViewmodelComponent;

	private tools!: Record<ToolType, ToolComponent>;
	private curTool?: ToolComponent;

	public override onStart(): void {
		super.onStart();

		this.constructViewmodel();
		this.constructTools();

		task.spawn(async () => {
			await this.attachToolJointToViewmodel();
			this.equipTool(ToolType.Hammer);
		});
	}

	public onRender(): void {
		if (!this.curTool) return;

		this.curTool.instance
			.GetDescendants()
			.filter((descendant) => descendant.IsA("BasePart"))
			.forEach((part) => {
				part.CastShadow = false;
				part.LocalTransparencyModifier = 0;
			});
	}

	public getCurrentTool(): ToolComponent | undefined {
		return this.curTool;
	}

	public equipTool(toolType: ToolType): void {
		if (!this.isAlive) return;

		const newTool = this.tools[toolType];
		if (!newTool) {
			warn(`Tool ${toolType} not found`);
			return;
		}

		const prevTool = this.curTool;
		if (!this.unequip()) return;
		if (prevTool === newTool) {
			Events.UnequipCurrentTool.fire();
			return;
		}

		this.curTool = newTool;
		this.curTool.equip();

		/**
		 * Attach the tool to the character after the next animation frame.
		 * This ensures the tool doesn't appear before the equip animation starts.
		 */
		task.spawn(() => {
			RunService.PreAnimation.Wait();
			if (this.curTool) {
				this.toolJoint.Part1 = this.curTool.instance.PrimaryPart;
				this.curTool.instance.Parent = this.instance;
			}
		});

		Events.EquipTool.fire(toolType);
		print(`Equipped ${toolType}`);
	}

	public unequip(): boolean {
		if (!this.curTool) return true;

		if (this.curTool.isActive) return false;

		this.curTool.unequip();

		this.curTool.instance.Parent = this.backpack;
		this.toolJoint.Part1 = undefined;
		this.curTool = undefined;

		return true;
	}

	private fetchToolJoint(): void {
		this.toolJoint =
			this.instance.Humanoid.RigType === Enum.HumanoidRigType.R6
				? (this.instance as R6GameCharacterInstance).Torso.ToolJoint
				: (this.instance as R15GameCharacterInstance).UpperTorso.ToolJoint;
	}

	private constructViewmodel(): void {
		print("Constructing viewmodel component...");

		this.viewmodel = this.components.addComponent<ViewmodelComponent>(this.instance);
		this.janitor.Add(() => {
			this.components.removeComponent<ViewmodelComponent>(this.instance);
		});

		print("Viewmodel component constructed.");
	}

	private constructTools(): void {
		const hammer = findFirstChildWithTag(this.backpack, ToolType.Hammer);
		const slingshot = findFirstChildWithTag(this.backpack, ToolType.Slingshot);
		if (!hammer || !slingshot) error("Missing tool instances in backpack");

		print("Constructing tool components...");

		this.tools = {
			[ToolType.Hammer]: this.components.addComponent<HammerComponent>(hammer),
			[ToolType.Slingshot]: this.components.addComponent<SlingshotComponent>(slingshot),
		};
		Object.values(this.tools).forEach((tool) => tool.initialize(this, this.viewmodel));

		this.janitor.Add(() => {
			this.components.removeComponent<HammerComponent>(hammer);
			this.components.removeComponent<SlingshotComponent>(slingshot);
		});

		print("Tool components constructed.");
	}

	private async attachToolJointToViewmodel(): Promise<void> {
		try {
			const viewmodelInstance = await this.viewmodel.waitForViewmodel();

			this.fetchToolJoint();
			this.toolJoint.Part0 = viewmodelInstance.Torso;
			this.toolJoint.Parent = viewmodelInstance.Torso;
		} catch (e) {
			error(`Viewmodel not found: ${e}`);
		}
	}
}
