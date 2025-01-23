import { Component, Components } from "@flamework/components";
import { OnRender, OnStart, OnTick } from "@flamework/core";
import Object from "@rbxts/object-utils";
import { RunService, Workspace } from "@rbxts/services";
import { TiltCharacterComponent, ViewmodelComponent } from "client/components/characters";
import { HammerComponent, SlingshotComponent, ToolComponent } from "client/components/tools";
import { CharacterController } from "client/controllers";
import { Events } from "client/network";
import { DisposableComponent } from "shared/components";
import { TILT_SEND_RATE } from "shared/constants";
import { HumanoidCharacterInstance, R6TWCharacterInstance, R15TWCharacterInstance } from "shared/types/characterTypes";
import { ToolType } from "shared/types/toolTypes";
import { findFirstChildWithTag } from "shared/utility";

@Component()
export class TWCharacterComponent
	extends DisposableComponent<{}, HumanoidCharacterInstance>
	implements OnStart, OnTick, OnRender
{
	private readonly FIELD_OF_VIEW: number = 90;

	public get isAlive(): boolean {
		return this._isAlive;
	}
	private set isAlive(value: boolean) {
		this._isAlive = value;
	}

	public get combatEnabled(): boolean {
		return this._combatEnabled;
	}
	private set combatEnabled(value: boolean) {
		this._combatEnabled = value;
	}

	public get player(): Player {
		return this._player;
	}

	public get camera(): Camera {
		return this._camera;
	}
	private set camera(value: Camera) {
		this._camera = value;
	}

	public get backpack(): Backpack {
		return this._backpack;
	}
	private set backpack(value: Backpack) {
		this._backpack = value;
	}

	private _isAlive: boolean = false;
	private _combatEnabled: boolean = true;

	private _player: Player;
	private _camera!: Camera;
	private _backpack!: Backpack;

	private tiltAccumulator: number = 0;
	private prevTiltAngle: number = 0;

	private toolJoint!: Motor6D;

	private tiltCharacter!: TiltCharacterComponent;
	private viewmodel!: ViewmodelComponent;

	private tools!: Record<ToolType, ToolComponent>;
	private curTool?: ToolComponent;

	public constructor(characterController: CharacterController, private components: Components) {
		super();
		this._player = characterController.player;
	}

	public onStart(): void {
		this.fetchPlayerObjects();
		this.initializeCamera();

		this.constructTiltCharacter();
		this.constructViewmodel();
		this.constructTools();

		task.spawn(async () => {
			await this.attachToolJointToViewmodel();
			this.equipTool(ToolType.Slingshot);
		});

		this.isAlive = true;

		this.instance.Humanoid.Died.Connect(() => this.onDied());
	}

	public onTick(dt: number): void {
		if (!this.isAlive) return;

		this.tiltAccumulator += dt;
		while (this.tiltAccumulator >= TILT_SEND_RATE) {
			this.updateTilt();
			this.tiltAccumulator -= TILT_SEND_RATE;
		}
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

	public override destroy(): void {
		if (this.isAlive) this.onDied();
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

	private fetchPlayerObjects(): void {
		const camera = Workspace.CurrentCamera;
		if (!camera) error("Missing camera in workspace");
		this.camera = camera;

		const backpack = this.player.FindFirstChildOfClass("Backpack");
		if (!backpack) error("Missing backpack in player instance");
		this.backpack = backpack;
	}

	private fetchToolJoint(): void {
		this.toolJoint =
			this.instance.Humanoid.RigType === Enum.HumanoidRigType.R6
				? (this.instance as R6TWCharacterInstance).Torso.ToolJoint
				: (this.instance as R15TWCharacterInstance).UpperTorso.ToolJoint;
	}

	private initializeCamera(): void {
		this.player.CameraMode = Enum.CameraMode.LockFirstPerson;
		this.camera.FieldOfView = this.FIELD_OF_VIEW;
	}

	private constructTiltCharacter(): void {
		print("Constructing tilt character component...");

		this.tiltCharacter = this.components.addComponent<TiltCharacterComponent>(this.instance);
		this.janitor.Add(() => {
			this.components.removeComponent<TiltCharacterComponent>(this.instance);
		});

		print("Tilt character component constructed.");
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
		for (const tool of Object.values(this.tools)) tool.initialize(this, this.viewmodel);

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

	private updateTilt(): void {
		const tiltAngle = math.asin(this.camera.CFrame.LookVector.Y ?? 0);
		if (math.abs(tiltAngle - this.prevTiltAngle) >= 0.01) {
			if (this.player.CameraMode !== Enum.CameraMode.LockFirstPerson) this.tiltCharacter.update(tiltAngle);
			Events.UpdateCharacterTilt.fire(tiltAngle);
			this.prevTiltAngle = tiltAngle;
		}
	}

	private onDied(): void {
		print("Died");
		this.isAlive = false;
		this.janitor.Cleanup();
	}
}
