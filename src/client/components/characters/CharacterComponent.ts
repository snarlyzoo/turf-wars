import { Component, Components } from "@flamework/components";
import { OnStart, OnTick } from "@flamework/core";
import { Workspace } from "@rbxts/services";
import { TiltCharacterComponent } from "client/components/characters/addons";
import { CharacterController } from "client/controllers";
import { Events } from "client/network";
import { DisposableComponent } from "shared/components";
import { TILT_UPDATE_SEND_RATE } from "shared/network";
import { HumanoidCharacterInstance } from "shared/types/characterTypes";

@Component()
export abstract class CharacterComponent
	extends DisposableComponent<{}, HumanoidCharacterInstance>
	implements OnStart, OnTick
{
	protected abstract readonly CAMERA_MODE: Enum.CameraMode;
	private readonly FIELD_OF_VIEW: number = 90;

	public readonly player: Player;
	public readonly team: Team;

	public get isAlive(): boolean {
		return this._isAlive;
	}
	private set isAlive(value: boolean) {
		this._isAlive = value;
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

	private _camera!: Camera;
	private _backpack!: Backpack;

	private tiltAccumulator: number = 0;
	private prevTiltAngle: number = 0;

	private toSneak: boolean = false;

	private tiltCharacter!: TiltCharacterComponent;

	public constructor(characterController: CharacterController, protected components: Components) {
		super();

		this.player = characterController.player;

		if (!this.player.Team) {
			error("Player does not have a team");
		}
		this.team = this.player.Team;
	}

	public onStart(): void {
		this.fetchPlayerObjects();
		this.initializeCamera();

		this.constructTiltCharacter();

		this.isAlive = true;

		this.instance.Humanoid.Died.Connect(() => this.onDied());
	}

	public onTick(dt: number): void {
		if (!this.isAlive) return;

		while (this.tiltAccumulator >= TILT_UPDATE_SEND_RATE) {
			this.updateTilt();
			this.tiltAccumulator -= TILT_UPDATE_SEND_RATE;
		}
		this.tiltAccumulator += dt;
	}

	public override destroy(): void {
		if (this.isAlive) this.onDied();
		super.destroy();
	}

	public sneak(toSneak: boolean): void {
		this.toSneak = toSneak;
		print(toSneak ? "Sneaking" : "Not sneaking");
	}

	private fetchPlayerObjects(): void {
		const camera = Workspace.CurrentCamera;
		if (!camera) error("Missing camera in workspace");
		this.camera = camera;

		const backpack = this.player.FindFirstChildOfClass("Backpack");
		if (!backpack) error("Missing backpack in player instance");
		this.backpack = backpack;
	}

	private initializeCamera(): void {
		this.player.CameraMode = this.CAMERA_MODE;
		this.camera.FieldOfView = this.FIELD_OF_VIEW;
	}

	private constructTiltCharacter(): void {
		print("Constructing tilt character component...");

		this.tiltCharacter = this.components.addComponent<TiltCharacterComponent>(this.instance);
		this.janitor.Add(() => {
			this.components.removeComponent<TiltCharacterComponent>(this.instance);
		});

		print("Tilt character component constructed");
	}

	private updateTilt(): void {
		const tiltAngle = math.asin(this.camera.CFrame.LookVector.Y ?? 0);
		if (math.abs(tiltAngle - this.prevTiltAngle) >= 0.01) {
			if (this.CAMERA_MODE !== Enum.CameraMode.LockFirstPerson) this.tiltCharacter.update(tiltAngle);
			Events.UpdateCharacterTilt.fire(tiltAngle);
			this.prevTiltAngle = tiltAngle;
		}
	}

	protected onDied(): void {
		this.isAlive = false;
		this.janitor.Cleanup();
	}
}
