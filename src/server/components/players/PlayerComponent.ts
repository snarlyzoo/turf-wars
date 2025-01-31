import { BaseComponent, Component } from "@flamework/components";
import { Flamework, OnStart } from "@flamework/core";
import { Events } from "server/network";
import { CharacterType, HumanoidCharacterInstance } from "shared/types/characterTypes";

const isHumanoidCharacter = Flamework.createGuard<HumanoidCharacterInstance>();

@Component()
export abstract class PlayerComponent extends BaseComponent<{}, Player> implements OnStart {
	protected abstract readonly characterType: CharacterType;

	public readonly team: Team;

	public get isAlive(): boolean {
		return this._isAlive;
	}
	private set isAlive(value: boolean) {
		this._isAlive = value;
	}
	private _isAlive: boolean = false;

	protected backpack?: Backpack;
	protected character?: HumanoidCharacterInstance;

	public constructor() {
		super();

		if (!this.instance.Team) {
			error(`${this.instance.Name} does not have a team`);
		}
		this.team = this.instance.Team;
	}

	public onStart(): void {
		this.instance.CharacterAdded.Connect((character) => this.onCharacterAdded(character));
		this.instance.CharacterRemoving.Connect(() => this.onCharacterRemoving());
	}

	public getBackpack(): Backpack | undefined {
		return this.backpack;
	}

	public getCharacter(): HumanoidCharacterInstance | undefined {
		return this.character;
	}

	public respawn(): void {
		this.instance.LoadCharacter();
		Events.ConstructCharacterComponent.fire(this.instance, this.characterType);
	}

	public updateTilt(angle?: number): void {
		if (!this.isAlive) return;

		const character = this.getCharacter();
		if (character) Events.CharacterTiltChanged.except(this.instance, character, angle);
	}

	private fetchBackpack(): void {
		const backpack = this.instance.FindFirstChildOfClass("Backpack");
		if (!backpack) {
			warn(`${this.instance.Name} does not have a backpack`);
		}
		this.backpack = backpack;
	}

	private setupCharacter(character: Model): void {
		if (!isHumanoidCharacter(character)) {
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
