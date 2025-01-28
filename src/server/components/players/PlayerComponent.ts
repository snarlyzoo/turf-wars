import { BaseComponent, Component } from "@flamework/components";
import { Flamework, OnStart } from "@flamework/core";
import { Events } from "server/network";
import { CharacterType, HumanoidCharacterInstance } from "shared/types/characterTypes";

@Component()
export abstract class PlayerComponent extends BaseComponent<{}, Player> implements OnStart {
	protected abstract readonly characterType: CharacterType;

	private readonly isHumanoidCharacter = Flamework.createGuard<HumanoidCharacterInstance>();

	public get isAlive(): boolean {
		return this._isAlive;
	}
	private set isAlive(value: boolean) {
		this._isAlive = value;
	}

	private _isAlive: boolean = false;

	protected backpack?: Backpack;
	protected character?: HumanoidCharacterInstance;

	public onStart(): void {
		this.instance.CharacterAdded.Connect((character) => this.onCharacterAdded(character));
		this.instance.CharacterRemoving.Connect(() => this.onCharacterRemoving());
	}

	public respawn(): void {
		this.instance.LoadCharacter();
		Events.ConstructCharacterComponent.fire(this.instance, this.characterType);
	}

	public getBackpack(): Backpack | undefined {
		if (!this.backpack) {
			warn(`${this.instance.Name} does not have a backpack`);
		}
		return this.backpack;
	}

	public getCharacter(): HumanoidCharacterInstance | undefined {
		if (!this.character) {
			warn(`${this.instance.Name} does not have a character`);
		}
		return this.character;
	}

	private fetchBackpack(): void {
		const backpack = this.instance.FindFirstChildOfClass("Backpack");
		if (!backpack) {
			warn(`${this.instance.Name} does not have a backpack`);
		}
		this.backpack = backpack;
	}

	private setupCharacter(character: Model): void {
		if (!this.isHumanoidCharacter(character)) {
			warn(`${this.instance.Name} does not have a humanoid character`);
			return;
		}
		this.character = character;
		this.character.PrimaryPart = this.character.HumanoidRootPart;
	}

	protected onCharacterAdded(character: Model): void {
		this.fetchBackpack();
		this.setupCharacter(character);

		this.isAlive = true;
	}

	private onCharacterRemoving(): void {
		if (this.isAlive) this.onDied();
	}

	protected onDied(): void {
		this.isAlive = false;
	}
}
