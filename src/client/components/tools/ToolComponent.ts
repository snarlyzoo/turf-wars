import { BaseComponent, Component, Components } from "@flamework/components";
import Object from "@rbxts/object-utils";
import { GameCharacterComponent } from "client/components/characters";
import { ViewmodelComponent } from "client/components/characters/addons";
import { ToolAnimations, ToolInstance, ToolType } from "shared/types/toolTypes";

@Component()
export abstract class ToolComponent extends BaseComponent<{}, ToolInstance> {
	public abstract readonly toolType: ToolType;

	public get equipped(): boolean {
		return this._equipped;
	}
	protected set equipped(value: boolean) {
		this._equipped = value;
	}

	public get isActive(): boolean {
		return this._isActive;
	}
	protected set isActive(value: boolean) {
		this._isActive = value;
	}

	public get mouseIcon(): string {
		return this._mouseIcon;
	}
	protected set mouseIcon(value: string) {
		this._mouseIcon = value;
	}

	private _equipped: boolean = false;
	private _isActive: boolean = false;
	private _mouseIcon: string = "rbxassetid://SystemCursors/Arrow";

	protected gameCharacter!: GameCharacterComponent;
	private viewmodel!: ViewmodelComponent;

	protected charAnimTracks!: Record<keyof ToolAnimations, AnimationTrack>;
	protected viewmodelAnimTracks!: Record<keyof ToolAnimations, AnimationTrack>;

	public constructor(protected components: Components) {
		super();
	}

	public initialize(gameCharacter: GameCharacterComponent, viewmodel: ViewmodelComponent): void {
		if (this.gameCharacter || this.viewmodel) error("Tool component already initialized");

		this.gameCharacter = gameCharacter;
		this.viewmodel = viewmodel;

		this.loadAnimations();
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
			const viewmodelAnimator = (await this.viewmodel.waitForViewmodel()).Humanoid.Animator;
			const viewmodelAnimations = this.instance.Animations.Viewmodel;
			this.viewmodelAnimTracks = {
				Idle: viewmodelAnimator.LoadAnimation(viewmodelAnimations.Idle),
				Equip: viewmodelAnimator.LoadAnimation(viewmodelAnimations.Equip),
			};
		} catch (e) {
			error(`Failed to load viewmodel animations: ${e}`);
		}

		print(`Animation tracks loaded for ${this.instance.Name}`);
	}
}
