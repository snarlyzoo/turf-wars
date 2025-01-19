import { BaseComponent, Component } from "@flamework/components";
import { OnRender, OnStart } from "@flamework/core";
import { TweenService, Workspace } from "@rbxts/services";
import { createViewmodel } from "client/utility";
import { TWCharacterInstance, ViewmodelInstance } from "shared/types/characterTypes";

const CAMERA_Y_OFFSET = -1.5;

@Component()
export class ViewmodelComponent extends BaseComponent<{}, TWCharacterInstance> implements OnStart, OnRender {
	private camera!: Camera;

	private cframeValue!: CFrameValue;
	private viewmodel!: ViewmodelInstance;

	public constructor() {
		super();
	}

	public onStart(): void {
		this.fetchCamera();

		this.createCFrameValue();

		this.viewmodel = createViewmodel();
		this.viewmodel.Parent = this.camera;

		this.instance.Torso.ToolJoint.Part0 = this.viewmodel.Torso;
	}

	public onRender(): void {
		if (!this.viewmodel) {
			return;
		}

		const camCFrame = this.camera.CFrame;
		this.viewmodel.PivotTo(camCFrame.mul(this.cframeValue.Value).add(camCFrame.UpVector.mul(CAMERA_Y_OFFSET)));

		this.viewmodel.HumanoidRootPart.RootJoint.Transform = this.instance.HumanoidRootPart.RootJoint.Transform;
		this.viewmodel.Torso["Left Shoulder"].Transform = this.instance.Torso["Left Shoulder"].Transform;
		this.viewmodel.Torso["Right Shoulder"].Transform = this.instance.Torso["Right Shoulder"].Transform;
	}

	private fetchCamera(): void {
		const camera = Workspace.CurrentCamera;
		if (!camera) {
			error("Missing camera in Workspace");
		}
		this.camera = camera;
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
			if (newState === Enum.HumanoidStateType.Landed) {
				fallTween.Cancel();
				landTween1.Play();
			} else if (newState === Enum.HumanoidStateType.Freefall) {
				landTween1.Cancel();
				landTween2.Cancel();
				fallTween.Play();
			}
		});
	}
}
