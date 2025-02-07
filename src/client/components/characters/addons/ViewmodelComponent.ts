import { Component } from "@flamework/components";
import { OnRender, OnStart } from "@flamework/core";
import { Players, RunService, TweenService, Workspace } from "@rbxts/services";
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

	private camera!: Camera;

	private cframeValue!: CFrameValue;
	private viewmodel!: ViewmodelInstance;

	public onStart(): void {
		this.fetchCamera();

		this.createViewmodel();
		this.createCFrameValue();

		const animator = new Instance("Animator");
		animator.Parent = this.viewmodel.Humanoid;
	}

	public onRender(): void {
		if (!this.viewmodel) return;

		const camCFrame = this.camera.CFrame;
		this.viewmodel.PivotTo(camCFrame.mul(this.cframeValue.Value).add(camCFrame.UpVector.mul(this.CAMERA_Y_OFFSET)));
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

		this.janitor.Add(this.viewmodel);
	}

	private createCFrameValue(): void {
		this.cframeValue = new Instance("CFrameValue");

		const landTween1 = TweenService.Create(
			this.cframeValue,
			new TweenInfo(0.1, Enum.EasingStyle.Sine, Enum.EasingDirection.Out),
			{
				Value: CFrame.Angles(-math.rad(5), 0, 0),
			},
		);
		const landTween2 = TweenService.Create(
			this.cframeValue,
			new TweenInfo(0.4, Enum.EasingStyle.Quart, Enum.EasingDirection.Out),
			{
				Value: new CFrame(),
			},
		);
		landTween1.Completed.Connect(() => {
			if (this.instance.Humanoid.GetState() !== Enum.HumanoidStateType.Freefall) {
				landTween2.Play();
			}
		});

		const fallTween = TweenService.Create(this.cframeValue, new TweenInfo(0.5, Enum.EasingStyle.Sine), {
			Value: CFrame.Angles(math.rad(7.5), 0, 0),
		});

		this.instance.Humanoid.StateChanged.Connect((_, newState) => {
			if (newState === Enum.HumanoidStateType.Running) {
				fallTween.Cancel();
				landTween1.Play();
			} else if (newState === Enum.HumanoidStateType.Freefall) {
				landTween1.Pause();
				fallTween.Play();
			}
		});
	}
}
