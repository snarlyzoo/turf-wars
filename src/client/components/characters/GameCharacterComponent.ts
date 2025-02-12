import { Component } from "@flamework/components";
import { OnRender } from "@flamework/core";
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

	private tools: Array<ToolComponent> = [];
	private curTool?: ToolComponent;

	public override onStart(): void {
		super.onStart();

		this.constructViewmodel();
		this.constructTools();

		task.spawn(async () => {
			await this.attachToolJointToViewmodel();
			this.equipTool(0);
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

	public equipTool(slot: number): void {
		if (!this.isAlive) return;

		const newTool = this.tools[slot];
		if (!newTool) {
			warn(`No tool found in slot ${slot}`);
			return;
		}

		if (newTool === this.curTool) return;
		this.unequip();

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

		Events.EquipTool.fire(this.curTool.toolType);
		print(`Equipped ${this.curTool.instance.Name}`);
	}

	public cycleTool(direction: number): void {
		if (this.tools.size() === 0) return;

		const curIndex = this.curTool ? this.tools.indexOf(this.curTool) : -1;
		const nextIndex = (curIndex + direction + this.tools.size()) % this.tools.size();
		this.equipTool(nextIndex);
	}

	public unequip(): boolean {
		if (!this.curTool) return true;

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

		print("Viewmodel component constructed");
	}

	private constructTools(): void {
		const hammer = findFirstChildWithTag(this.backpack, ToolType.Hammer);
		const slingshot = findFirstChildWithTag(this.backpack, ToolType.Slingshot);
		if (!hammer || !slingshot) error("Missing tool instances in backpack");

		print("Constructing tool components...");

		this.tools.push(this.components.addComponent<SlingshotComponent>(slingshot));
		this.tools.push(this.components.addComponent<HammerComponent>(hammer));
		this.tools.forEach((tool) => tool.initialize(this, this.viewmodel));

		this.janitor.Add(() => {
			this.unequip();
			this.tools.clear();

			this.components.removeComponent<HammerComponent>(hammer);
			this.components.removeComponent<SlingshotComponent>(slingshot);
		});

		print("Tool components constructed");
	}

	private async attachToolJointToViewmodel(): Promise<void> {
		try {
			const viewmodelInstance = await this.viewmodel.waitForViewmodel();

			this.fetchToolJoint();
			this.toolJoint.Part0 = viewmodelInstance.Torso;
			this.toolJoint.Parent = viewmodelInstance.Torso;
		} catch (e) {
			error(`Failed to attach tool joint to viewmodel: ${e}`);
		}
	}
}
