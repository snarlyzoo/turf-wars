import { BaseComponent, Component } from "@flamework/components";
import { TWCharacterComponent, ViewmodelComponent } from "client/components/characters";
import { ToolAnimations, ToolInstance } from "shared/types/toolTypes";

@Component()
export abstract class ToolComponent extends BaseComponent<{}, ToolInstance> {
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

	protected twCharacter!: TWCharacterComponent;

	protected charAnimTracks!: Record<keyof ToolAnimations, AnimationTrack>;
	protected viewmodelAnimTracks!: Record<keyof ToolAnimations, AnimationTrack>;

	private viewmodel!: ViewmodelComponent;

	public constructor() {
		super();
	}

	public initialize(twCharacter: TWCharacterComponent, viewmodel: ViewmodelComponent): void {
		this.twCharacter = twCharacter;
		this.viewmodel = viewmodel;

		this.loadAnimations();
	}

	public equip(): void {
		if (this.equipped) {
			return;
		}
		this.equipped = true;

		this.charAnimTracks.Idle.Play();
		this.viewmodelAnimTracks.Idle.Play();

		this.charAnimTracks.Equip.Play(0);
		this.viewmodelAnimTracks.Equip.Play(0);
	}

	public unequip(): void {
		if (!this.equipped) {
			return;
		}
		this.equipped = false;

		for (const [, anim] of pairs(this.charAnimTracks)) {
			anim.Stop();
		}
		for (const [, anim] of pairs(this.viewmodelAnimTracks)) {
			anim.Stop();
		}
	}

	public abstract usePrimaryAction(toActivate: boolean): void;

	public useSecondaryAction(toActivate: boolean): void {
		warn(`Secondary action not implemented for ${this.instance.Name}`);
	}

	private loadAnimations(): void {
		const charAnimator = this.twCharacter.instance.Humanoid.Animator;
		const animations =
			this.twCharacter.instance.Humanoid.RigType === Enum.HumanoidRigType.R6
				? this.instance.Animations.R6
				: this.instance.Animations.R15;
		this.charAnimTracks = {
			Idle: charAnimator.LoadAnimation(animations.Idle),
			Equip: charAnimator.LoadAnimation(animations.Equip),
		};

		task.spawn(async () => {
			try {
				const viewmodelAnimator = (await this.viewmodel.waitForViewmodel()).Humanoid.Animator;
				this.viewmodelAnimTracks = {
					Idle: viewmodelAnimator.LoadAnimation(this.instance.Animations.Viewmodel.Idle),
					Equip: viewmodelAnimator.LoadAnimation(this.instance.Animations.Viewmodel.Equip),
				};
			} catch (e) {
				error(`Failed to load viewmodel animations: ${e}`);
			}
		});

		print(`Animation tracks loaded for ${this.instance.Name}`);
	}
}
