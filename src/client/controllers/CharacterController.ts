import { Components } from "@flamework/components";
import { Controller, OnStart } from "@flamework/core";
import { AbstractConstructor, Constructor } from "@flamework/core/out/utility";
import { ContextActionService, Players, ReplicatedStorage, Workspace } from "@rbxts/services";
import Signal from "@rbxts/signal";
import { CharacterComponent, GameCharacterComponent, LobbyCharacterComponent } from "client/components/characters";
import { Events } from "client/network";
import { CHARACTER_EVENT_RATE_LIMIT, TOOL_EVENT_RATE_LIMIT } from "shared/network";
import { CharacterType } from "shared/types/characterTypes";
import { TargetIndicator } from "shared/types/toolTypes";

enum BaseAction {
	Sneak = "Sneak",
}

enum GameAction {
	EquipPrimary = "EquipPrimary",
	EquipSecondary = "EquipSecondary",

	CycleToolForward = "CycleToolForward",
	CycleToolBackward = "CycleToolBackward",

	PrimaryToolAction = "PrimaryToolAction",
	SecondaryToolAction = "SecondaryToolAction",
}

interface InputAction {
	actionName: string;
	input: (Enum.KeyCode | Enum.UserInputType)[];
	callback: (actionName: string, inputState: Enum.UserInputState) => void;
}

type ControlModule = {
	Enable(): void;
	Disable(): void;
};

@Controller()
class CharacterController implements OnStart {
	private BASE_INPUT_ACTIONS: InputAction[] = [
		{
			actionName: BaseAction.Sneak,
			input: [Enum.KeyCode.LeftShift, Enum.KeyCode.ButtonL3],
			callback: (_, inputState): void => this.onSneak(inputState),
		},
	];
	private GAME_INPUT_ACTIONS: InputAction[] = [
		{
			actionName: GameAction.EquipPrimary,
			input: [Enum.KeyCode.One],
			callback: (_, inputState): void => this.onEquipAction(0, inputState),
		},
		{
			actionName: GameAction.EquipSecondary,
			input: [Enum.KeyCode.Two],
			callback: (_, inputState): void => this.onEquipAction(1, inputState),
		},
		{
			actionName: GameAction.CycleToolForward,
			input: [Enum.KeyCode.ButtonR1],
			callback: (_, inputState): void => this.onCycleTool(1, inputState),
		},
		{
			actionName: GameAction.CycleToolBackward,
			input: [Enum.KeyCode.ButtonL1],
			callback: (_, inputState): void => this.onCycleTool(-1, inputState),
		},
		{
			actionName: GameAction.PrimaryToolAction,
			input: [Enum.UserInputType.MouseButton1, Enum.KeyCode.ButtonR2],
			callback: (_, inputState): void => this.onToolAction(true, inputState),
		},
		{
			actionName: GameAction.SecondaryToolAction,
			input: [Enum.UserInputType.MouseButton2, Enum.KeyCode.ButtonL2],
			callback: (_, inputState): void => this.onToolAction(false, inputState),
		},
	];

	public readonly player: Player = Players.LocalPlayer;

	public get team(): Team {
		return this._team;
	}
	private set team(value: Team) {
		this._team = value;
		this.TeamChanged.Fire(value);
	}
	private _team!: Team;
	public readonly TeamChanged: Signal<(team: Team) => void> = new Signal();

	public get camera(): Camera {
		return this._camera;
	}
	private set camera(value: Camera) {
		this._camera = value;
	}
	public get backpack(): Backpack {
		return this._backpack;
	}
	private set backpack(value: Backpack) {
		this._backpack = value;
	}
	private _camera!: Camera;
	private _backpack!: Backpack;

	private characterType: CharacterType = CharacterType.Lobby;
	private characterComponent?: CharacterComponent;

	public readonly CharacterAdded: Signal<(characterComponent: CharacterComponent) => void> = new Signal();
	public readonly CharacterRemoved: Signal<() => void> = new Signal();

	private controlModule!: ControlModule;

	private curInputActions: InputAction[] = [];

	private lastCharacterEventTick: number = 0;
	private lastToolEventTick: number = 0;

	public get blockCount(): number {
		return this._blockCount;
	}
	public set blockCount(value: number) {
		this._blockCount = value;
		this.BlockCountChanged.Fire(value);
	}
	private _blockCount: number = 0;
	public readonly BlockCountChanged: Signal<(amount: number) => void> = new Signal();

	// TODO: Find a better way to reference these objects
	public blockPrefab = ReplicatedStorage.FindFirstChild("Block") as BasePart;
	public targetIndicator = ReplicatedStorage.FindFirstChild("TargetIndicator") as TargetIndicator;

	public get projectileCount(): number {
		return this._projectileCount;
	}
	public set projectileCount(value: number) {
		this._projectileCount = value;
		this.ProjectileCountChanged.Fire(value);
	}
	private _projectileCount: number = 0;
	public readonly ProjectileCountChanged: Signal<(amount: number) => void> = new Signal();

	public projectilePrefab = ReplicatedStorage.FindFirstChild("Projectile") as PVInstance;

	public constructor(private components: Components) {}

	public onStart(): void {
		this.getControlModule().then((controlModule) => (this.controlModule = controlModule));

		this.player.GetPropertyChangedSignal("Team").Connect(() => this.onTeamChanged());

		this.player.CharacterAdded.Connect((character) => this.onCharacterAdded(character));
		this.player.CharacterRemoving.Connect((character) => this.onCharacterRemoving(character));

		Events.SetCharacterType.connect((characterType) => this.onSetCharacterType(characterType));

		Events.UpdateResources.connect((blockCount, projectileCount) => {
			this.blockCount = blockCount;
			this.projectileCount = projectileCount;
		});
	}

	public resetCamera(): void {
		this.camera.CameraType = Enum.CameraType.Custom;

		const humanoid = this.characterComponent?.instance.FindFirstChildOfClass("Humanoid");
		if (!humanoid) {
			warn("Character does not have a humanoid");
			return;
		}
		this.camera.CameraSubject = humanoid;
	}

	public getCharacterComponent<T extends CharacterComponent>(componentClass: AbstractConstructor<T>): T | undefined {
		return this.characterComponent instanceof componentClass ? this.characterComponent : undefined;
	}

	private async getControlModule(): Promise<ControlModule> {
		return require(this.player
			.WaitForChild("PlayerScripts")
			.WaitForChild("PlayerModule")
			.WaitForChild("ControlModule") as ModuleScript) as ControlModule;
	}

	private fetchPlayerObjects(): void {
		const camera = Workspace.CurrentCamera;
		if (!camera) error("Missing camera in workspace");
		this.camera = camera;

		const backpack = this.player.FindFirstChildOfClass("Backpack");
		if (!backpack) error("Missing backpack in player instance");
		this.backpack = backpack;
	}

	private bindInputActions(inputActions: InputAction[]): void {
		inputActions.forEach((inputAction) => {
			ContextActionService.BindAction(inputAction.actionName, inputAction.callback, false, ...inputAction.input);
		});
		this.curInputActions = inputActions;
	}
	private unbindInputActions(inputActions: InputAction[]): void {
		inputActions.forEach((inputAction) => {
			ContextActionService.UnbindAction(inputAction.actionName);
		});
		this.curInputActions = [];
	}

	private canFireEvent(lastEventTick: number, rateLimit: number): [boolean, number] {
		const tick = os.clock();
		if (tick - lastEventTick < rateLimit) return [false, lastEventTick];
		return [true, tick];
	}

	private onTeamChanged(): void {
		const team = this.player.Team;
		if (!team) error("Player does not have a team");
		this.team = team;
	}

	private onCharacterAdded(character: Model): void {
		if (this.characterType === CharacterType.None) return;

		print("Character added");

		this.fetchPlayerObjects();

		character.WaitForChild("HumanoidRootPart");

		let componentClass: Constructor<CharacterComponent>;
		let inputActions: InputAction[] = this.BASE_INPUT_ACTIONS;
		switch (this.characterType) {
			case CharacterType.Game:
				componentClass = GameCharacterComponent;
				inputActions = [...inputActions, ...this.GAME_INPUT_ACTIONS];
				break;
			case CharacterType.Lobby:
				componentClass = LobbyCharacterComponent;
				break;
		}

		print(`Constructing ${componentClass}...`);

		const characterComponent = this.components.addComponent(character, componentClass);
		this.bindInputActions(inputActions);

		this.characterComponent = characterComponent;
		this.CharacterAdded.Fire(characterComponent);

		this.resetCamera();

		print(`${componentClass} constructed`);
	}

	private onCharacterRemoving(character: Model): void {
		if (!this.characterComponent) return;

		if (this.characterComponent instanceof GameCharacterComponent) {
			this.components.removeComponent<GameCharacterComponent>(character);
		} else if (this.characterComponent instanceof LobbyCharacterComponent) {
			this.components.removeComponent<LobbyCharacterComponent>(character);
		}
		this.unbindInputActions(this.curInputActions);

		this.characterComponent = undefined;
		this.CharacterRemoved.Fire();

		this.blockCount = 0;
		this.projectileCount = 0;
	}

	private onSetCharacterType(characterType: CharacterType): void {
		this.characterType = characterType;

		if (characterType === CharacterType.None) {
			this.controlModule.Disable();
			if (this.characterComponent) this.onCharacterRemoving(this.characterComponent.instance);
		} else {
			this.controlModule.Enable();
		}
	}

	private onSneak(inputState: Enum.UserInputState): void {
		if (!this.characterComponent) return;

		if (inputState === Enum.UserInputState.Begin) {
			this.characterComponent.sneak(true);
		} else if (inputState === Enum.UserInputState.End) {
			this.characterComponent.sneak(false);
		}
	}

	private onEquipAction(slot: number, inputState: Enum.UserInputState): void {
		if (inputState !== Enum.UserInputState.Begin) return;

		const gameCharacter = this.getCharacterComponent(GameCharacterComponent);
		if (!gameCharacter) return;

		const [allowed, tick] = this.canFireEvent(this.lastCharacterEventTick, CHARACTER_EVENT_RATE_LIMIT);
		if (!allowed) return;
		this.lastCharacterEventTick = tick;

		gameCharacter.equipTool(slot);
	}

	private onCycleTool(direction: number, inputState: Enum.UserInputState): void {
		if (inputState !== Enum.UserInputState.Begin) return;

		const gameCharacter = this.getCharacterComponent(GameCharacterComponent);
		if (!gameCharacter) return;

		const [allowed, tick] = this.canFireEvent(this.lastCharacterEventTick, CHARACTER_EVENT_RATE_LIMIT);
		if (!allowed) return;
		this.lastCharacterEventTick = tick;

		gameCharacter.cycleTool(direction);
	}

	private onToolAction(isPrimaryAction: boolean, inputState: Enum.UserInputState): void {
		const gameCharacter = this.getCharacterComponent(GameCharacterComponent);
		if (!gameCharacter) return;

		const tool = gameCharacter.getCurrentTool();
		if (!tool) return;

		if (inputState === Enum.UserInputState.Begin) {
			const [allowed, tick] = this.canFireEvent(this.lastToolEventTick, TOOL_EVENT_RATE_LIMIT);
			if (!allowed) return;
			this.lastToolEventTick = tick;

			isPrimaryAction ? tool.usePrimaryAction(true) : tool.hasSecondaryAction && tool.useSecondaryAction();
		} else if (inputState === Enum.UserInputState.End && isPrimaryAction) {
			tool.usePrimaryAction(false);
		}
	}
}

export default CharacterController;
