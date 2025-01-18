import { Component, Components } from "@flamework/components";
import { OnStart, OnTick } from "@flamework/core";
import { Players, RunService, Workspace } from "@rbxts/services";
import { TiltCharacterComponent } from ".";
import { HammerComponent, SlingshotComponent, ToolComponent } from "client/components/tools";
import { DisposableComponent } from "shared/components";
import { TILT_SEND_RATE } from "shared/constants";
import { ToolType, TWCharacterInstance } from "shared/types";
import { findFirstChildWithTag } from "shared/utility";
import { Events } from "client/network";

const FIELD_OF_VIEW = 90;

const player = Players.LocalPlayer;

@Component()
export class TWCharacterComponent extends DisposableComponent<{}, TWCharacterInstance> implements OnStart, OnTick {
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

	private tools!: Record<ToolType, ToolComponent>;
	private curTool?: ToolComponent;

	public constructor(private components: Components) {
		super();
	}

	public onStart(): void {
		this.fetchPlayerEssentials();
		this.camera.FieldOfView = FIELD_OF_VIEW;
		player.CameraMode = Enum.CameraMode.LockFirstPerson;

		this.constructTiltCharacter();
		this.constructTools();

		this.janitor.Add(this.instance.Humanoid.Died.Connect(() => this.onDied()));

		this.isAlive = true;

		this.equipTool(ToolType.Slingshot);
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

		task.spawn(() => {
			RunService.PreAnimation.Wait();
			if (this.curTool) {
				this.instance.Torso.ToolJoint.Part1 = this.curTool.instance.PrimaryPart;
				this.curTool.instance.Parent = this.instance;
			}
		});

		Events.EquipTool.fire(toolType);

		print(`Equipped ${toolType}`);
	}

	public unequip(): boolean {
		const curTool = this.curTool;
		if (!curTool) {
			return true;
		}

		if (curTool.isActive) {
			return false;
		}

		this.curTool = undefined;
		curTool.unequip();

		this.instance.Torso.ToolJoint.Part1 = undefined;
		curTool.instance.Parent = this.backpack;

		return true;
	}

	private onDied(): void {
		print("Died");

		this.isAlive = false;

		this.janitor.Cleanup();
	}

	private fetchPlayerEssentials(): void {
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

	private constructTiltCharacter(): void {
		print("Constructing tilt character component...");

		this.tiltCharacter = this.components.addComponent<TiltCharacterComponent>(this.instance);
		this.janitor.Add(() => {
			this.components.removeComponent<TiltCharacterComponent>(this.instance);
		});

		print("Tilt character component constructed.");
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
		this.janitor.Add(() => {
			this.components.removeComponent<HammerComponent>(hammer);
			this.components.removeComponent<SlingshotComponent>(slingshot);
		});

		print("Tool components constructed.");
	}
}
