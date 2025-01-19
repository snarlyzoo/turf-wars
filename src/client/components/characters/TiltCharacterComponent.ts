import { BaseComponent, Component } from "@flamework/components";
import { TweenService, Workspace } from "@rbxts/services";
import { TILT_SEND_RATE } from "shared/constants";
import { TWCharacterInstance } from "shared/types/characterTypes";

const MAX_RENDER_DISTANCE = 100;

const JOINT_CFRAMES = {
	Neck: new CFrame(0, 1, 0),
	LeftShoulder: new CFrame(-1, 0.5, 0, 0, 0, -1, 0, 1, 0, 1, 0, 0),
	RightShoulder: new CFrame(1, 0.5, 0, 0, 0, 1, 0, 1, 0, -1, 0, 0),
} as const;

const TWEEN_INFO = new TweenInfo(TILT_SEND_RATE + 0.01, Enum.EasingStyle.Quad, Enum.EasingDirection.Out);

@Component()
export class TiltCharacterComponent extends BaseComponent<{}, TWCharacterInstance> {
	private lastAngle: number = 0;

	public update(angle?: number): void {
		if (angle !== undefined && angle === this.lastAngle) {
			return;
		}

		const distance = Workspace.CurrentCamera?.CFrame.Position.sub(this.instance.GetPivot().Position).Magnitude;
		if (distance === undefined || distance > MAX_RENDER_DISTANCE) {
			return;
		}

		const target = angle ?? this.lastAngle;

		this.tweenNeck(target);
		this.tweenShoulders(target);

		this.lastAngle = target;
	}

	private tweenNeck(angle: number): void {
		TweenService.Create(this.instance.Torso.Neck, TWEEN_INFO, {
			C0: JOINT_CFRAMES.Neck.mul(CFrame.Angles(angle + math.rad(-90), 0, math.rad(180))),
		}).Play();
	}

	private tweenShoulders(angle: number): void {
		let leftShoulderC0 = JOINT_CFRAMES.LeftShoulder;
		let rightShoulderC0 = JOINT_CFRAMES.RightShoulder;
		if (this.instance.Torso.ToolJoint.Part1 !== undefined) {
			leftShoulderC0 = leftShoulderC0.mul(CFrame.Angles(0, 0, -angle));
			rightShoulderC0 = rightShoulderC0.mul(CFrame.Angles(0, 0, angle));

			TweenService.Create(this.instance.Torso.ToolJoint, TWEEN_INFO, {
				C0: CFrame.Angles(angle, 1.55, 0).mul(CFrame.Angles(0, -math.pi / 2, 0)),
			}).Play();
		}

		/**
		 * Tweens the shoulder joints only if the new C0 differs from the current C0.
		 * This ensures the shoulders return to their original position when the tool is unequipped,
		 * while avoiding redundant tweening afterward.
		 */
		if (this.instance.Torso["Left Shoulder"].C0 !== leftShoulderC0) {
			TweenService.Create(this.instance.Torso["Left Shoulder"], TWEEN_INFO, {
				C0: leftShoulderC0,
			}).Play();
			TweenService.Create(this.instance.Torso["Right Shoulder"], TWEEN_INFO, {
				C0: rightShoulderC0,
			}).Play();
		}
	}
}
