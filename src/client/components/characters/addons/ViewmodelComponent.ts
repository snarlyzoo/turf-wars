import { Component } from "@flamework/components";
import { OnRender, OnStart } from "@flamework/core";
import { config, createMotion, Motion, SpringOptions } from "@rbxts/ripple";
import { Players, RunService, StarterPlayer, Workspace } from "@rbxts/services";
import { DisposableComponent } from "shared/components";
import { HumanoidCharacterInstance, R6CharacterInstance, ViewmodelInstance } from "shared/types/characterTypes";

@Component()
export class ViewmodelComponent
	extends DisposableComponent<{}, HumanoidCharacterInstance>
	implements OnStart, OnRender
{
	private readonly USER_ID: number = RunService.IsStudio() ? 107484074 : Players.LocalPlayer.UserId;

	private readonly CAMERA_Y_OFFSET: number = -1.5;

	private readonly COLLISION_GROUP: string = "Viewmodel";
	private readonly ARM_SIZE: Vector3 = new Vector3(0.5, 2, 0.5);

	private readonly VALID_DESCENDANTS = {
		["Body Colors"]: true,
		["Shirt"]: true,
		["Humanoid"]: true,
		["HumanoidRootPart"]: true,
		["Left Arm"]: true,
		["Right Arm"]: true,
		["Torso"]: true,
		["Left Shoulder"]: true,
		["Right Shoulder"]: true,
		["RootJoint"]: true,
	} as const;

	private readonly LAND_SPRING_OPTIONS: SpringOptions = { damping: 0.4, frequency: 0.25 };
	private readonly SWAY_SPRING_OPTIONS: SpringOptions = { tension: 210, friction: 20 };

	private readonly MAX_SWAY_ANGLE: number = math.rad(1);
	private readonly HORIZONTAL_SWAY_FREQUENCY: number = 8;
	private readonly VERTICAL_SWAY_FREQUENCY: number = 16;

	private camera!: Camera;

	private viewmodel!: ViewmodelInstance;

	private jumpMotion: Motion<CFrame> = createMotion(new CFrame(), { start: true });
	private swayMotion: Motion<CFrame> = createMotion(new CFrame(), { start: true });

	public onStart(): void {
		this.fetchCamera();

		this.createViewmodel();

		this.instance.Humanoid.StateChanged.Connect((_, newState) => this.onHumanoidStateChanged(newState));
	}

	public onRender(): void {
		if (!this.viewmodel) return;

		this.updateSway();

		const camCFrame = this.camera.CFrame;
		this.viewmodel.PivotTo(
			camCFrame
				.mul(this.jumpMotion.get().mul(this.swayMotion.get()))
				.add(camCFrame.UpVector.mul(this.CAMERA_Y_OFFSET)),
		);
	}

	public override destroy(): void {
		this.viewmodel.Destroy();
		super.destroy();
	}

	public async waitForViewmodel(): Promise<ViewmodelInstance> {
		if (this.viewmodel) return this.viewmodel;
		return new Promise((resolve) => {
			while (!this.viewmodel) task.wait();
			resolve(this.viewmodel);
		});
	}

	private fetchCamera(): void {
		const camera = Workspace.CurrentCamera;
		if (!camera) {
			error("Missing camera in Workspace");
		}
		this.camera = camera;
	}

	private createViewmodel(): void {
		const viewmodel = Players.CreateHumanoidModelFromDescription(
			Players.GetHumanoidDescriptionFromUserId(this.USER_ID),
			Enum.HumanoidRigType.R6,
		) as R6CharacterInstance;

		viewmodel.Name = "Viewmodel";

		viewmodel.HumanoidRootPart.Anchored = true;
		viewmodel.PrimaryPart = viewmodel.HumanoidRootPart;

		viewmodel.Humanoid.DisplayDistanceType = Enum.HumanoidDisplayDistanceType.None;
		viewmodel.Humanoid.EvaluateStateMachine = false;
		viewmodel.Humanoid.RequiresNeck = false;

		viewmodel.GetDescendants().forEach((descendant) => {
			if (!(descendant.Name in this.VALID_DESCENDANTS)) {
				descendant.Destroy();
			} else if (descendant.IsA("BasePart")) {
				descendant.CastShadow = false;
				descendant.CollisionGroup = this.COLLISION_GROUP;
				descendant.Massless = true;
			}
		});

		viewmodel.Torso.Transparency = 1;

		viewmodel["Left Arm"].Size = this.ARM_SIZE;
		viewmodel["Right Arm"].Size = this.ARM_SIZE;

		this.viewmodel = viewmodel as ViewmodelInstance;
		this.viewmodel.Parent = this.camera;

		const animator = new Instance("Animator");
		animator.Parent = this.viewmodel.Humanoid;

		this.janitor.Add(this.viewmodel);
	}

	private updateSway(): void {
		let velocity = this.instance.HumanoidRootPart.AssemblyLinearVelocity;
		velocity = new Vector3(velocity.X, 0, velocity.Z);

		const factor = math.clamp(velocity.Magnitude / StarterPlayer.CharacterWalkSpeed, 0, 1);

		const tick = os.clock();
		const angleX = math.cos(tick * this.VERTICAL_SWAY_FREQUENCY) * factor * this.MAX_SWAY_ANGLE;
		const angleY = math.sin(tick * this.HORIZONTAL_SWAY_FREQUENCY) * factor * this.MAX_SWAY_ANGLE;

		this.swayMotion.spring(CFrame.Angles(angleX, angleY, 0), this.SWAY_SPRING_OPTIONS);
	}

	private onHumanoidStateChanged(newState: Enum.HumanoidStateType): void {
		if (newState === Enum.HumanoidStateType.Running) {
			this.jumpMotion.spring(new CFrame(), this.LAND_SPRING_OPTIONS);
		} else if (newState === Enum.HumanoidStateType.Freefall) {
			this.jumpMotion.spring(CFrame.Angles(math.rad(7.5), 0, 0));
		}
	}
}
