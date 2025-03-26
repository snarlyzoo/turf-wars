import { Component } from "@flamework/components";
import { OnRender } from "@flamework/core";
import { RunService, TextChatService, UserInputService } from "@rbxts/services";
import Signal from "@rbxts/signal";
import { ViewmodelComponent } from "client/components/characters/addons";
import { HammerComponent, SlingshotComponent, ToolComponent } from "client/components/tools";
import { Events } from "client/network";
import { R15GameCharacterInstance, R6GameCharacterInstance } from "shared/types/characterTypes";
import { ToolType } from "shared/types/toolTypes";
import { findFirstChildWithTag } from "shared/utility";
import CharacterComponent from "./CharacterComponent";

@Component()
class GameCharacterComponent extends CharacterComponent implements OnRender {
	protected override CAMERA_MODE = Enum.CameraMode.LockFirstPerson;

	public get tools(): Array<ToolComponent> {
		return this._tools;
	}
	private _tools: Array<ToolComponent> = [];

	public readonly ToolEquipped: Signal<(slot: number) => void> = new Signal();

	public get viewmodel(): ViewmodelComponent {
		return this._viewmodel;
	}
	private set viewmodel(value: ViewmodelComponent) {
		this._viewmodel = value;
	}
	private _viewmodel!: ViewmodelComponent;

	private curTool!: ToolComponent | undefined;

	private chatInputBarConfig?: ChatInputBarConfiguration;

	private toolJoint!: Motor6D;

	public override onStart(): void {
		super.onStart();

		this.fetchChatInputBarConfig();

		this.constructViewmodel();
		this.attachToolJointToViewmodel();

		this.constructTools();
		this.tools[0].AnimationsLoaded.Connect(() => this.equipTool(0));

		this.janitor.Add(this.ToolEquipped);
		this.janitor.Add(() => (UserInputService.MouseBehavior = Enum.MouseBehavior.Default));
	}

	public override onTick(dt: number): void {
		super.onTick(dt);

		UserInputService.MouseBehavior = this.chatInputBarConfig?.IsFocused
			? Enum.MouseBehavior.Default
			: Enum.MouseBehavior.LockCenter;
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

		this.ToolEquipped.Fire(slot);
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

		this.curTool.instance.Parent = this.controller.backpack;
		this.toolJoint.Part1 = undefined;

		return true;
	}

	public getCurrentTool(): ToolComponent | undefined {
		return this.curTool;
	}

	private fetchChatInputBarConfig(): void {
		this.chatInputBarConfig = TextChatService.FindFirstChildOfClass("ChatInputBarConfiguration");
		if (!this.chatInputBarConfig) warn("Chat input bar configuration not found");
	}

	private fetchToolJoint(): void {
		this.toolJoint =
			this.instance.Humanoid.RigType === Enum.HumanoidRigType.R6
				? (this.instance as R6GameCharacterInstance).Torso.ToolJoint
				: (this.instance as R15GameCharacterInstance).UpperTorso.ToolJoint;
	}

	private constructViewmodel(): void {
		print("Constructing ViewmodelComponent...");

		this.viewmodel = this.components.addComponent<ViewmodelComponent>(this.instance);
		this.janitor.Add(() => {
			this.components.removeComponent<ViewmodelComponent>(this.instance);
		});

		print("ViewmodelComponent constructed");
	}

	private constructTools(): void {
		const hammer = findFirstChildWithTag(this.controller.backpack, ToolType.Hammer);
		const slingshot = findFirstChildWithTag(this.controller.backpack, ToolType.Slingshot);
		if (!hammer || !slingshot) error("Missing tool instances in backpack");

		print("Constructing ToolComponents...");

		this.tools.push(this.components.addComponent<SlingshotComponent>(slingshot));
		this.tools.push(this.components.addComponent<HammerComponent>(hammer));

		this.janitor.Add(() => {
			this.unequip();

			this.components.removeComponent<SlingshotComponent>(slingshot);
			this.components.removeComponent<HammerComponent>(hammer);
			this.tools.clear();
		});

		print("ToolComponents constructed");
	}

	private async attachToolJointToViewmodel(): Promise<void> {
		try {
			const viewmodelInstance = await this.viewmodel.waitForViewmodel();

			this.fetchToolJoint();
			this.toolJoint.Part0 = viewmodelInstance.Torso;
			this.toolJoint.Parent = viewmodelInstance.Torso;
		} catch {
			error("Failed to attach tool joint to viewmodel");
		}
	}
}

export default GameCharacterComponent;
