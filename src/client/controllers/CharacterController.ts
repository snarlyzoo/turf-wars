import { Components } from "@flamework/components";
import { Controller, OnStart } from "@flamework/core";
import { ContextActionService, Players } from "@rbxts/services";
import { CharacterComponent, GameCharacterComponent, LobbyCharacterComponent } from "client/components/characters";
import { Events } from "client/network";
import { CHARACTER_EVENT_RATE_LIMIT, TOOL_EVENT_RATE_LIMIT } from "shared/network";
import { CharacterType } from "shared/types/characterTypes";

enum DefaultAction {
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

@Controller()
export class CharacterController implements OnStart {
	public readonly player: Player = Players.LocalPlayer;

	private characterType: CharacterType = CharacterType.Lobby;
	private characterComponent?: CharacterComponent;

	private combatEnabled: boolean = false;

	private lastCharacterEventTick: number = 0;
	private lastToolEventTick: number = 0;

	private defaultInputActions: InputAction[] = [
		{
			actionName: DefaultAction.Sneak,
			input: [Enum.KeyCode.LeftShift, Enum.KeyCode.ButtonL3],
			callback: (_, inputState): void => this.onSneak(inputState),
		},
	];
	private gameInputActions: InputAction[] = [
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

	public constructor(private components: Components) {}

	public onStart(): void {
		Events.SetCharacterType.connect((characterType) => (this.characterType = characterType));
		Events.SetCombatEnabled.connect((enabled) => this.onSetCombatEnabled(enabled));

		this.player.CharacterAdded.Connect((character) => this.onCharacterAdded(character));
		this.player.CharacterRemoving.Connect((character) => this.onCharacterRemoving(character));
	}

	private bindInputActions(inputActions: InputAction[]): void {
		inputActions.forEach((inputAction) => {
			ContextActionService.BindAction(inputAction.actionName, inputAction.callback, false, ...inputAction.input);
		});
	}
	private unbindInputActions(inputActions: InputAction[]): void {
		inputActions.forEach((inputAction) => {
			ContextActionService.UnbindAction(inputAction.actionName);
		});
	}

	private canFireEvent(lastEventTick: number, rateLimit: number): [boolean, number] {
		const tick = os.clock();
		if (tick - lastEventTick < rateLimit) return [false, lastEventTick];
		return [true, tick];
	}

	private getGameCharacter(): GameCharacterComponent | undefined {
		return this.characterComponent instanceof GameCharacterComponent ? this.characterComponent : undefined;
	}

	private onCharacterAdded(character: Model): void {
		print("Character added");
		character.WaitForChild("HumanoidRootPart");

		print(`Constructing ${this.characterType} character component...`);

		let characterComponent: CharacterComponent;
		switch (this.characterType) {
			case CharacterType.Game:
				characterComponent = this.components.addComponent<GameCharacterComponent>(character);
				(characterComponent as GameCharacterComponent).combatEnabled = this.combatEnabled;
				this.bindInputActions(this.gameInputActions);
				break;
			case CharacterType.Lobby:
				characterComponent = this.components.addComponent<LobbyCharacterComponent>(character);
				break;
			default:
				error(`Invalid character type: ${this.characterType}`);
		}
		this.characterComponent = characterComponent;

		this.bindInputActions(this.defaultInputActions);

		print(`${this.characterType} character component constructed`);
	}

	private onSetCombatEnabled(enabled: boolean): void {
		this.combatEnabled = enabled;
		if (this.characterComponent instanceof GameCharacterComponent)
			this.characterComponent.combatEnabled = this.combatEnabled;
	}

	private onCharacterRemoving(character: Model): void {
		if (!this.characterComponent) return;

		if (this.characterComponent instanceof GameCharacterComponent) {
			this.components.removeComponent<GameCharacterComponent>(character);
			this.unbindInputActions(this.gameInputActions);
		} else {
			this.components.removeComponent<LobbyCharacterComponent>(character);
		}

		this.unbindInputActions(this.defaultInputActions);

		this.characterComponent = undefined;
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

		const gameCharacter = this.getGameCharacter();
		if (!gameCharacter) return;

		const [allowed, tick] = this.canFireEvent(this.lastCharacterEventTick, CHARACTER_EVENT_RATE_LIMIT);
		if (!allowed) return;
		this.lastCharacterEventTick = tick;

		gameCharacter.equipTool(slot);
	}

	private onCycleTool(direction: number, inputState: Enum.UserInputState): void {
		if (inputState !== Enum.UserInputState.Begin) return;

		const gameCharacter = this.getGameCharacter();
		if (!gameCharacter) return;

		const [allowed, tick] = this.canFireEvent(this.lastCharacterEventTick, CHARACTER_EVENT_RATE_LIMIT);
		if (!allowed) return;
		this.lastCharacterEventTick = tick;

		gameCharacter.cycleTool(direction);
	}

	private onToolAction(isPrimaryAction: boolean, inputState: Enum.UserInputState): void {
		const gameCharacter = this.getGameCharacter();
		if (!gameCharacter) return;

		const tool = gameCharacter.getCurrentTool();
		if (!tool) return;

		if (inputState === Enum.UserInputState.Begin) {
			const [allowed, tick] = this.canFireEvent(this.lastToolEventTick, TOOL_EVENT_RATE_LIMIT);
			if (!allowed) return;
			this.lastToolEventTick = tick;

			isPrimaryAction ? tool.usePrimaryAction(true) : tool.useSecondaryAction();
		} else if (inputState === Enum.UserInputState.End && isPrimaryAction) {
			tool.usePrimaryAction(false);
		}
	}
}
