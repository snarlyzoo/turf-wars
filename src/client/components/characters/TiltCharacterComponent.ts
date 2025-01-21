import { BaseComponent, Component } from "@flamework/components";
import { OnStart } from "@flamework/core";
import { TweenService, Workspace } from "@rbxts/services";
import { TILT_SEND_RATE } from "shared/constants";
import { HumanoidCharacterInstance, R6TWCharacterInstance, R15TWCharacterInstance } from "shared/types/characterTypes";

const MAX_RENDER_DISTANCE = 100;

const R15_JOINT_CFRAMES = {
	Neck: new CFrame(0, 1, 0),
	LeftShoulder: new CFrame(-1, 0.5, 0),
	RightShoulder: new CFrame(1, 0.5, 0),
} as const;
const R6_JOINT_CFRAMES = {
	Neck: R15_JOINT_CFRAMES.Neck,
	LeftShoulder: R15_JOINT_CFRAMES.LeftShoulder.mul(CFrame.Angles(0, math.rad(-90), 0)),
	RightShoulder: R15_JOINT_CFRAMES.RightShoulder.mul(CFrame.Angles(0, math.rad(90), 0)),
} as const;

const TWEEN_INFO = new TweenInfo(TILT_SEND_RATE + 0.01, Enum.EasingStyle.Quad, Enum.EasingDirection.Out);

@Component()
export class TiltCharacterComponent extends BaseComponent<{}, HumanoidCharacterInstance> implements OnStart {
	private lastAngle: number = 0;

	private neck!: Motor6D;
	private leftShoulder!: Motor6D;
	private rightShoulder!: Motor6D;
	private toolJoint!: Motor6D;

	public onStart(): void {
		this.fetchJoints();
	}

	public update(angle?: number): void {
		if (angle !== undefined && angle === this.lastAngle) {
			return;
		}

		const distance = Workspace.CurrentCamera?.CFrame.Position.sub(this.instance.GetPivot().Position).Magnitude;
		if (distance === undefined || distance > MAX_RENDER_DISTANCE) {
			return;
		}

		const target = angle ?? this.lastAngle;

		const isR6Character = this.instance.Humanoid.RigType === Enum.HumanoidRigType.R6;

		TweenService.Create(this.neck, TWEEN_INFO, {
			C0: isR6Character ? this.calculateR6NeckC0(target) : this.calculateR15NeckC0(target),
		}).Play();

		const [leftShoulderC0, rightShoulderC0, toolJointC0] = isR6Character
			? this.calculateR6ShoulderC0s(target)
			: this.calculateR15ShoulderC0s(target);

		/**
		 * Tweens the shoulder joints only if the new C0 differs from the current C0.
		 * This ensures the shoulders return to their original position when the tool is unequipped,
		 * while avoiding redundant tweening afterward.
		 */
		if (this.rightShoulder.C0 !== rightShoulderC0) {
			if (this.toolJoint.Part1?.GetAttribute("TwoHanded") === true) {
				TweenService.Create(this.leftShoulder, TWEEN_INFO, { C0: leftShoulderC0 }).Play();
			}
			TweenService.Create(this.rightShoulder, TWEEN_INFO, { C0: rightShoulderC0 }).Play();
		}

		if (toolJointC0) {
			TweenService.Create(this.toolJoint, TWEEN_INFO, { C0: toolJointC0 }).Play();
		}

		this.lastAngle = target;
	}

	private fetchJoints(): void {
		if (this.instance.Humanoid.RigType === Enum.HumanoidRigType.R6) {
			const character = this.instance as R6TWCharacterInstance;
			this.neck = character.Torso.Neck;
			this.leftShoulder = character.Torso["Left Shoulder"];
			this.rightShoulder = character.Torso["Right Shoulder"];
			this.toolJoint = character.Torso.ToolJoint;
		} else {
			const character = this.instance as R15TWCharacterInstance;
			this.neck = character.Head.Neck;
			this.leftShoulder = character.LeftUpperArm.LeftShoulder;
			this.rightShoulder = character.RightUpperArm.RightShoulder;
			this.toolJoint = character.UpperTorso.ToolJoint;
		}
	}

	private calculateR6NeckC0(angle: number): CFrame {
		return R6_JOINT_CFRAMES.Neck.mul(CFrame.Angles(angle + math.rad(-90), 0, math.rad(180)));
	}
	private calculateR15NeckC0(angle: number): CFrame {
		return R15_JOINT_CFRAMES.Neck.mul(CFrame.Angles(angle, 0, 0));
	}

	private calculateR6ShoulderC0s(angle: number): [CFrame, CFrame, CFrame | undefined] {
		let leftShoulderC0 = R6_JOINT_CFRAMES.LeftShoulder;
		let rightShoulderC0 = R6_JOINT_CFRAMES.RightShoulder;
		let toolJointC0;
		if (this.toolJoint.Part1 !== undefined) {
			leftShoulderC0 = leftShoulderC0.mul(CFrame.Angles(0, 0, -angle));
			rightShoulderC0 = rightShoulderC0.mul(CFrame.Angles(0, 0, angle));
			toolJointC0 = rightShoulderC0.mul(new CFrame(0, -0.5, -1).mul(CFrame.Angles(0, -math.rad(90), 0)));
		}
		return [leftShoulderC0, rightShoulderC0, toolJointC0];
	}
	private calculateR15ShoulderC0s(angle: number): [CFrame, CFrame, CFrame | undefined] {
		let leftShoulderC0 = R15_JOINT_CFRAMES.LeftShoulder;
		let rightShoulderC0 = R15_JOINT_CFRAMES.RightShoulder;
		let toolJointC0;
		if (this.toolJoint.Part1 !== undefined) {
			leftShoulderC0 = leftShoulderC0.mul(CFrame.Angles(angle, 0, 0));
			rightShoulderC0 = rightShoulderC0.mul(CFrame.Angles(angle, 0, 0));
			toolJointC0 = rightShoulderC0.mul(new CFrame(-1, -0.5, 0));
		}
		return [leftShoulderC0, rightShoulderC0, toolJointC0];
	}
}
