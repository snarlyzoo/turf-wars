import { Component, Components } from "@flamework/components";
import { OnPhysics, OnStart, OnTick } from "@flamework/core";
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
	implements OnStart, OnTick, OnPhysics
{
	protected abstract readonly CAMERA_MODE: Enum.CameraMode;
	private readonly FIELD_OF_VIEW: number = 90;

	private readonly JUMP_IMPULSE: Vector3 = new Vector3(0, 250, 0);

	private readonly FLOOR_SENSOR_SEARCH_DISTANCE: number = 0.5;
	private readonly FLOOR_SENSOR_RESET_DELAY: number = 0.1;

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

	private controllerManager!: ControllerManager;
	private groundController!: GroundController;
	private airController!: AirController;
	private floorSensor!: ControllerPartSensor;

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

		this.constructControllerManager();

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

	public onPhysics(dt: number): void {
		if (!this.isAlive) return;

		const moveDirection = this.instance.Humanoid.MoveDirection;
		this.controllerManager.MovingDirection = moveDirection;
		this.controllerManager.FacingDirection =
			moveDirection.Magnitude > 0 ? moveDirection : this.instance.GetPivot().LookVector;

		if (this.checkRunningState()) {
			this.controllerManager.ActiveController = this.groundController;
			this.instance.Humanoid.ChangeState(Enum.HumanoidStateType.Running);
		} else if (this.checkFreefallState()) {
			this.controllerManager.ActiveController = this.airController;
			this.instance.Humanoid.ChangeState(Enum.HumanoidStateType.Freefall);
		}
	}

	public override destroy(): void {
		if (this.isAlive) this.onDied();
		super.destroy();
	}

	public jump(): void {
		if (!this.isAlive) return;

		if (!this.isControllerActive(this.groundController)) return;

		this.instance.HumanoidRootPart.ApplyImpulse(this.JUMP_IMPULSE);
		this.instance.Humanoid.ChangeState(Enum.HumanoidStateType.Jumping);

		const searchDistance = this.floorSensor.SearchDistance;
		this.floorSensor.SearchDistance = 0;
		task.delay(this.FLOOR_SENSOR_RESET_DELAY, () => {
			if (this.floorSensor.SearchDistance === 0) this.floorSensor.SearchDistance = searchDistance;
		});

		this.controllerManager.ActiveController = this.airController;
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

	private constructControllerManager(): void {
		this.instance.Humanoid.EvaluateStateMachine = false;

		this.controllerManager = new Instance("ControllerManager");
		this.controllerManager.RootPart = this.instance.PrimaryPart;

		this.groundController = new Instance("GroundController");
		this.groundController.GroundOffset = this.instance.Humanoid.HipHeight;
		this.groundController.FrictionWeight = 100;
		this.groundController.Parent = this.controllerManager;

		this.airController = new Instance("AirController");
		this.airController.Parent = this.controllerManager;

		this.floorSensor = new Instance("ControllerPartSensor");
		this.floorSensor.Name = "FloorSensor";
		this.floorSensor.SensorMode = Enum.SensorMode.Floor;
		this.floorSensor.SearchDistance = this.groundController.GroundOffset + this.FLOOR_SENSOR_SEARCH_DISTANCE;
		this.floorSensor.Parent = this.controllerManager.RootPart;

		this.controllerManager.GroundSensor = this.floorSensor;
		this.controllerManager.Parent = this.instance;
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

	private isControllerActive(controller: ControllerBase): boolean {
		return this.controllerManager.ActiveController === controller && controller.Active;
	}

	private checkRunningState(): boolean {
		return (
			this.floorSensor.SensedPart !== undefined &&
			!this.isControllerActive(this.groundController) &&
			this.instance.Humanoid.GetState() !== Enum.HumanoidStateType.Jumping
		);
	}

	private checkFreefallState(): boolean {
		return (
			(this.floorSensor.SensedPart === undefined && !this.isControllerActive(this.airController)) ||
			this.instance.Humanoid.GetState() === Enum.HumanoidStateType.Jumping
		);
	}

	private onDied(): void {
		this.isAlive = false;
		this.janitor.Cleanup();
	}
}
