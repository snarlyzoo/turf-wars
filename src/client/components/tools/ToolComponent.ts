import { Component, Components } from "@flamework/components";
import { OnStart } from "@flamework/core";
import Object from "@rbxts/object-utils";
import Signal from "@rbxts/signal";
import { GameCharacterComponent } from "client/components/characters";
import { CharacterController } from "client/controllers";
import { DisposableComponent } from "shared/components";
import { ResourceType, ToolAnimations, ToolInstance, ToolType } from "shared/types/toolTypes";

@Component()
export abstract class ToolComponent extends DisposableComponent<{}, ToolInstance> implements OnStart {
	public abstract readonly toolType: ToolType;
	public abstract readonly resourceType: ResourceType;

	public abstract readonly hasSecondaryAction: boolean;

	public get equipped(): boolean {
		return this._equipped;
	}
	protected set equipped(value: boolean) {
		this._equipped = value;
	}
	private _equipped: boolean = false;
	public get isActive(): boolean {
		return this._isActive;
	}
	protected set isActive(value: boolean) {
		this._isActive = value;
	}
	private _isActive: boolean = false;

	public get mouseIcon(): string {
		return this._mouseIcon;
	}
	protected set mouseIcon(value: string) {
		this._mouseIcon = value;
	}
	private _mouseIcon: string = "rbxassetid://SystemCursors/Arrow";

	public AnimationsLoaded: Signal<() => void> = new Signal();

	protected gameCharacter!: GameCharacterComponent;

	protected charAnimTracks!: Record<keyof ToolAnimations, AnimationTrack>;
	protected viewmodelAnimTracks!: Record<keyof ToolAnimations, AnimationTrack>;

	public constructor(protected characterController: CharacterController, protected components: Components) {
		super();
	}

	public async onStart(): Promise<void> {
		const characterComponent = await Promise.fromEvent(this.characterController.CharacterAdded);
		if (!characterComponent || !(characterComponent instanceof GameCharacterComponent))
			error("Game character not found");
		this.gameCharacter = characterComponent;

		this.loadAnimations();

		this.janitor.Add(this.AnimationsLoaded);
	}

	public equip(): void {
		if (this.equipped) return;

		this.equipped = true;

		if (!this.charAnimTracks || !this.viewmodelAnimTracks) {
			warn("Tool animations not loaded");
			return;
		}

		this.charAnimTracks.Idle.Play();
		this.viewmodelAnimTracks.Idle.Play();

		this.charAnimTracks.Equip.Play(0);
		this.viewmodelAnimTracks.Equip.Play(0);
	}

	public unequip(): void {
		if (!this.equipped) return;
		this.equipped = false;

		if (this.isActive) this.usePrimaryAction(false);

		Object.values(this.charAnimTracks).forEach((anim) => anim.Stop());
		Object.values(this.viewmodelAnimTracks).forEach((anim) => anim.Stop());
	}

	public abstract usePrimaryAction(toActivate: boolean): void;

	public useSecondaryAction(): void {
		warn(`Secondary action not implemented for ${this.instance.Name}`);
	}

	private async loadAnimations(): Promise<void> {
		const charAnimator = this.gameCharacter.instance.Humanoid.Animator;
		const charAnimations =
			this.gameCharacter.instance.Humanoid.RigType === Enum.HumanoidRigType.R6
				? this.instance.Animations.R6
				: this.instance.Animations.R15;
		this.charAnimTracks = {
			Idle: charAnimator.LoadAnimation(charAnimations.Idle),
			Equip: charAnimator.LoadAnimation(charAnimations.Equip),
		};

		try {
			const viewmodelAnimator = (await this.gameCharacter.viewmodel.waitForViewmodel()).Humanoid.Animator;
			const viewmodelAnimations = this.instance.Animations.Viewmodel;
			this.viewmodelAnimTracks = {
				Idle: viewmodelAnimator.LoadAnimation(viewmodelAnimations.Idle),
				Equip: viewmodelAnimator.LoadAnimation(viewmodelAnimations.Equip),
			};
		} catch {
			error("Failed to load viewmodel animations");
		}

		print(`Animation tracks loaded for ${this.instance.Name}`);

		this.AnimationsLoaded.Fire();
	}
}
