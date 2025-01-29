import { BaseComponent, Component } from "@flamework/components";
import { OnStart } from "@flamework/core";
import { TweenService, Workspace } from "@rbxts/services";
import { TILT_UPDATE_SEND_RATE } from "shared/network";
import { HumanoidCharacterInstance, R6CharacterInstance, R15CharacterInstance } from "shared/types/characterTypes";

@Component()
export class TiltCharacterComponent extends BaseComponent<{}, HumanoidCharacterInstance> implements OnStart {
	private readonly MAX_RENDER_DISTANCE: number = 100;

	private readonly TWEEN_INFO: TweenInfo = new TweenInfo(
		TILT_UPDATE_SEND_RATE + 0.01,
		Enum.EasingStyle.Quad,
		Enum.EasingDirection.Out,
	);

	private readonly R6_JOINT_CFRAMES = {
		Neck: new CFrame(0, 1, 0),
		LeftShoulder: new CFrame(-1, 0.5, 0).mul(CFrame.Angles(0, math.rad(-90), 0)),
		RightShoulder: new CFrame(1, 0.5, 0).mul(CFrame.Angles(0, math.rad(90), 0)),
	} as const;
	private readonly R15_JOINT_CFRAMES = {
		Neck: new CFrame(0, 1, 0),
		LeftShoulder: new CFrame(-1, 0.5, 0),
		RightShoulder: new CFrame(1, 0.5, 0),
	} as const;

	private lastAngle: number = 0;

	private neck!: Motor6D;
	private leftShoulder!: Motor6D;
	private rightShoulder!: Motor6D;
	private toolJoint?: Motor6D;

	public onStart(): void {
		this.fetchJoints();
	}

	public update(angle?: number): void {
		if (angle !== undefined && angle === this.lastAngle) return;

		const distance = Workspace.CurrentCamera?.CFrame.Position.sub(this.instance.GetPivot().Position).Magnitude;
		if (distance === undefined || distance > this.MAX_RENDER_DISTANCE) return;

		const target = angle ?? this.lastAngle;

		const isR6Character = this.instance.Humanoid.RigType === Enum.HumanoidRigType.R6;
		TweenService.Create(this.neck, this.TWEEN_INFO, {
			C0: isR6Character ? this.calculateR6NeckC0(target) : this.calculateR15NeckC0(target),
		}).Play();

		if (this.toolJoint) {
			const isToolEquipped = this.toolJoint.Part1 !== undefined;
			const [leftShoulderC0, rightShoulderC0, toolJointC0] = isR6Character
				? this.calculateR6ShoulderC0s(target, isToolEquipped)
				: this.calculateR15ShoulderC0s(target, isToolEquipped);

			/**
			 * Tweens the shoulder joints only if the new C0 differs from the current C0.
			 * This ensures the shoulders return to their original position when the tool is unequipped,
			 * while avoiding redundant tweening afterward.
			 */
			if (this.rightShoulder.C0 !== rightShoulderC0) {
				if (this.toolJoint.Part1?.GetAttribute("TwoHanded") === true) {
					TweenService.Create(this.leftShoulder, this.TWEEN_INFO, { C0: leftShoulderC0 }).Play();
				}
				TweenService.Create(this.rightShoulder, this.TWEEN_INFO, { C0: rightShoulderC0 }).Play();
			}

			if (toolJointC0) {
				TweenService.Create(this.toolJoint, this.TWEEN_INFO, { C0: toolJointC0 }).Play();
			}
		}

		this.lastAngle = target;
	}

	private fetchJoints(): void {
		if (this.instance.Humanoid.RigType === Enum.HumanoidRigType.R6) {
			const character = this.instance as R6CharacterInstance;
			this.neck = character.Torso.Neck;
			this.leftShoulder = character.Torso["Left Shoulder"];
			this.rightShoulder = character.Torso["Right Shoulder"];
			this.toolJoint = character.Torso.FindFirstChild("ToolJoint") as Motor6D;
		} else {
			const character = this.instance as R15CharacterInstance;
			this.neck = character.Head.Neck;
			this.leftShoulder = character.LeftUpperArm.LeftShoulder;
			this.rightShoulder = character.RightUpperArm.RightShoulder;
			this.toolJoint = character.UpperTorso.FindFirstChild("ToolJoint") as Motor6D;
		}
	}

	private calculateR6NeckC0(angle: number): CFrame {
		return this.R6_JOINT_CFRAMES.Neck.mul(CFrame.Angles(angle + math.rad(-90), 0, math.rad(180)));
	}
	private calculateR15NeckC0(angle: number): CFrame {
		return this.R15_JOINT_CFRAMES.Neck.mul(CFrame.Angles(angle, 0, 0));
	}

	private calculateR6ShoulderC0s(angle: number, isToolEquipped: boolean): [CFrame, CFrame, CFrame | undefined] {
		let leftShoulderC0 = this.R6_JOINT_CFRAMES.LeftShoulder;
		let rightShoulderC0 = this.R6_JOINT_CFRAMES.RightShoulder;
		let toolJointC0;
		if (isToolEquipped) {
			leftShoulderC0 = leftShoulderC0.mul(CFrame.Angles(0, 0, -angle));
			rightShoulderC0 = rightShoulderC0.mul(CFrame.Angles(0, 0, angle));
			toolJointC0 = rightShoulderC0.mul(new CFrame(0, -0.5, -1).mul(CFrame.Angles(0, -math.rad(90), 0)));
		}
		return [leftShoulderC0, rightShoulderC0, toolJointC0];
	}
	private calculateR15ShoulderC0s(angle: number, isToolEquipped: boolean): [CFrame, CFrame, CFrame | undefined] {
		let leftShoulderC0 = this.R15_JOINT_CFRAMES.LeftShoulder;
		let rightShoulderC0 = this.R15_JOINT_CFRAMES.RightShoulder;
		let toolJointC0;
		if (isToolEquipped) {
			leftShoulderC0 = leftShoulderC0.mul(CFrame.Angles(angle, 0, 0));
			rightShoulderC0 = rightShoulderC0.mul(CFrame.Angles(angle, 0, 0));
			toolJointC0 = rightShoulderC0.mul(new CFrame(-1, -0.5, 0));
		}
		return [leftShoulderC0, rightShoulderC0, toolJointC0];
	}
}
