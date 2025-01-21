import { Component, Components } from "@flamework/components";
import { OnRender, OnStart, OnTick } from "@flamework/core";
import { Players, RunService, Workspace } from "@rbxts/services";
import { TiltCharacterComponent, ViewmodelComponent } from "client/components/characters";
import { HammerComponent, SlingshotComponent, ToolComponent } from "client/components/tools";
import { Events } from "client/network";
import { DisposableComponent } from "shared/components";
import { TILT_SEND_RATE } from "shared/constants";
import { HumanoidCharacterInstance, R6TWCharacterInstance, R15TWCharacterInstance } from "shared/types/characterTypes";
import { ToolType } from "shared/types/toolTypes";
import { findFirstChildWithTag } from "shared/utility";

const FIELD_OF_VIEW = 90;

const player = Players.LocalPlayer;

@Component()
export class TWCharacterComponent
	extends DisposableComponent<{}, HumanoidCharacterInstance>
	implements OnStart, OnTick, OnRender
{
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

	private _isAlive: boolean = false;
	private _combatEnabled: boolean = false;

	private tiltAccumulator: number = 0;
	private prevTiltAngle: number = 0;

	private camera!: Camera;
	private backpack!: Backpack;

	private tiltCharacter!: TiltCharacterComponent;

	private viewmodel!: ViewmodelComponent;
	private toolJoint!: Motor6D;

	private tools!: Record<ToolType, ToolComponent>;
	private curTool?: ToolComponent;

	public constructor(private components: Components) {
		super();
	}

	public onStart(): void {
		this.fetchPlayerObjects();
		this.camera.FieldOfView = FIELD_OF_VIEW;
		player.CameraMode = Enum.CameraMode.LockFirstPerson;

		this.constructTiltCharacter();

		this.constructViewmodel();
		this.fetchToolJoint();

		this.constructTools();

		this.instance.Humanoid.Died.Connect(() => this.onDied());

		task.spawn(async () => {
			try {
				const viewmodelInstance = await this.viewmodel.waitForViewmodel();
				this.toolJoint.Part0 = viewmodelInstance.Torso;
				this.toolJoint.Parent = viewmodelInstance.Torso;

				this.isAlive = true;

				this.equipTool(ToolType.Slingshot);
			} catch (e) {
				error(`Viewmodel not found: ${e}`);
			}
		});
	}

	public onTick(dt: number): void {
		if (!this.isAlive) {
			return;
		}

		this.tiltAccumulator += dt;
		while (this.tiltAccumulator >= TILT_SEND_RATE) {
			const tiltAngle = math.asin(this.camera.CFrame.LookVector.Y ?? 0);
			if (math.abs(tiltAngle - this.prevTiltAngle) >= 0.01) {
				if (player.CameraMode !== Enum.CameraMode.LockFirstPerson) {
					this.tiltCharacter.update(tiltAngle);
				}

				Events.UpdateCharacterTilt.fire(tiltAngle);

				this.prevTiltAngle = tiltAngle;
			}

			this.tiltAccumulator -= TILT_SEND_RATE;
		}
	}

	public onRender(): void {
		if (!this.curTool) {
			return;
		}

		for (const descendant of this.curTool.instance.GetDescendants()) {
			if (descendant.IsA("BasePart")) {
				descendant.CastShadow = false;
				descendant.LocalTransparencyModifier = 0;
			}
		}
	}

	public override destroy(): void {
		if (this.isAlive) {
			this.onDied();
		}
	}

	public equipTool(toolType: ToolType): void {
		if (!this.isAlive) {
			return;
		}

		const newTool = this.tools[toolType];
		if (!newTool) {
			warn(`Tool ${toolType} not found`);
			return;
		}

		const prevTool = this.curTool;
		if (!this.unequip()) {
			return;
		}
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
		if (!this.curTool) {
			return true;
		}

		if (this.curTool.isActive) {
			return false;
		}

		this.curTool.unequip();

		this.curTool.instance.Parent = this.backpack;
		this.toolJoint.Part1 = undefined;
		this.curTool = undefined;

		return true;
	}

	private onDied(): void {
		print("Died");

		this.isAlive = false;

		this.janitor.Cleanup();
	}

	private fetchToolJoint(): void {
		if (this.instance.Humanoid.RigType === Enum.HumanoidRigType.R6) {
			this.toolJoint = (this.instance as R6TWCharacterInstance).Torso.ToolJoint;
		} else {
			this.toolJoint = (this.instance as R15TWCharacterInstance).UpperTorso.ToolJoint;
		}
	}

	private constructTiltCharacter(): void {
		print("Constructing tilt character component...");

		this.tiltCharacter = this.components.addComponent<TiltCharacterComponent>(this.instance);
		this.janitor.Add(() => {
			this.components.removeComponent<TiltCharacterComponent>(this.instance);
		});

		print("Tilt character component constructed.");
	}

	private fetchPlayerObjects(): void {
		const camera = Workspace.CurrentCamera;
		if (!camera) {
			error("Missing camera in workspace");
		}
		this.camera = camera;

		const backpack = player.FindFirstChildOfClass("Backpack");
		if (!backpack) {
			error("Missing backpack in player instance");
		}
		this.backpack = backpack;
	}

	private constructTools(): void {
		const hammer = findFirstChildWithTag(this.backpack, ToolType.Hammer);
		const slingshot = findFirstChildWithTag(this.backpack, ToolType.Slingshot);
		if (!hammer || !slingshot) {
			error("Missing tool instances in backpack");
		}

		print("Constructing tool components...");

		this.tools = {
			[ToolType.Hammer]: this.components.addComponent<HammerComponent>(hammer),
			[ToolType.Slingshot]: this.components.addComponent<SlingshotComponent>(slingshot),
		};
		for (const [_, tool] of pairs(this.tools)) {
			tool.initialize(this, this.viewmodel);
		}

		this.janitor.Add(() => {
			this.components.removeComponent<HammerComponent>(hammer);
			this.components.removeComponent<SlingshotComponent>(slingshot);
		});

		print("Tool components constructed.");
	}

	private constructViewmodel(): void {
		print("Constructing viewmodel component...");

		this.viewmodel = this.components.addComponent<ViewmodelComponent>(this.instance);
		this.janitor.Add(() => {
			this.components.removeComponent<ViewmodelComponent>(this.instance);
		});

		print("Viewmodel component constructed.");
	}
}
