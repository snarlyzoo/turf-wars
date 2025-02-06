import { Components } from "@flamework/components";
import { Controller, OnStart } from "@flamework/core";
import { ContextActionService, Players, UserInputService } from "@rbxts/services";
import { CharacterComponent, GameCharacterComponent, LobbyCharacterComponent } from "client/components/characters";
import { Events } from "client/network";
import { CHARACTER_EVENT_RATE_LIMIT, TOOL_EVENT_RATE_LIMIT } from "shared/network";
import { CharacterType } from "shared/types/characterTypes";
import { ToolType } from "shared/types/toolTypes";

enum DefaultAction {
	Sneak = "Sneak",
}

enum GameAction {
	EquipPrimary = "EquipPrimary",
	EquipSecondary = "EquipSecondary",
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

	private combatEnabled: boolean = false;

	private characterComponent?: CharacterComponent;

	private lastCharacterEventTick: number = 0;
	private lastToolEventTick: number = 0;

	private defaultInputActions: InputAction[] = [
		{
			actionName: DefaultAction.Sneak,
			input: [Enum.KeyCode.LeftShift, Enum.KeyCode.ButtonL3],
			callback: (actionName, inputState): void => this.onSneak(actionName, inputState),
		},
	];
	private gameInputActions: InputAction[] = [
		{
			actionName: GameAction.EquipPrimary,
			input: [Enum.KeyCode.One, Enum.KeyCode.ButtonR1],
			callback: (actionName, inputState): void => this.onEquipAction(actionName, inputState),
		},
		{
			actionName: GameAction.EquipSecondary,
			input: [Enum.KeyCode.Two, Enum.KeyCode.ButtonL1],
			callback: (actionName, inputState): void => this.onEquipAction(actionName, inputState),
		},
		{
			actionName: GameAction.PrimaryToolAction,
			input: [Enum.UserInputType.MouseButton1, Enum.KeyCode.ButtonR2],
			callback: (actionName, inputState): void => this.onToolAction(actionName, inputState),
		},
		{
			actionName: GameAction.SecondaryToolAction,
			input: [Enum.UserInputType.MouseButton2, Enum.KeyCode.ButtonL2],
			callback: (actionName, inputState): void => this.onToolAction(actionName, inputState),
		},
	];

	public constructor(private components: Components) {}

	public onStart(): void {
		Events.ConstructCharacterComponent.connect((characterType) =>
			this.onConstructCharacterComponent(characterType),
		);
		Events.SetCombatEnabled.connect((enabled) => this.onSetCombatEnabled(enabled));

		this.player.CharacterRemoving.Connect((character) => this.onCharacterRemoving(character));

		UserInputService.JumpRequest.Connect(() => this.onJumpRequest());
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

	private onConstructCharacterComponent(characterType: CharacterType): void {
		const character = this.player.Character;
		if (!character) {
			warn("Local player does not have a character");
			return;
		}
		character.WaitForChild("HumanoidRootPart");

		print(`Constructing ${characterType} character component...`);

		let characterComponent: CharacterComponent;
		if (characterType === CharacterType.Game) {
			characterComponent = this.components.addComponent<GameCharacterComponent>(character);
			(characterComponent as GameCharacterComponent).combatEnabled = this.combatEnabled;
			this.bindInputActions(this.gameInputActions);
		} else {
			characterComponent = this.components.addComponent<LobbyCharacterComponent>(character);
		}
		this.characterComponent = characterComponent;

		this.bindInputActions(this.defaultInputActions);

		print(`${characterType} character component constructed`);
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

	private onJumpRequest(): void {
		if (!this.characterComponent) return;

		this.characterComponent.jump();
	}

	private onSneak(actionName: string, inputState: Enum.UserInputState): void {
		if (!this.characterComponent) return;

		if (inputState === Enum.UserInputState.Begin) {
			this.characterComponent.sneak(true);
		} else if (inputState === Enum.UserInputState.End) {
			this.characterComponent.sneak(false);
		}
	}

	private onEquipAction(actionName: string, inputState: Enum.UserInputState): void {
		const gameCharacter = this.getGameCharacter();
		if (!gameCharacter) return;

		if (inputState === Enum.UserInputState.Begin) {
			const [allowed, tick] = this.canFireEvent(this.lastCharacterEventTick, CHARACTER_EVENT_RATE_LIMIT);
			if (!allowed) return;
			this.lastCharacterEventTick = tick;

			gameCharacter.equipTool(actionName === "EquipPrimary" ? ToolType.Slingshot : ToolType.Hammer);
		}
	}

	private onToolAction(actionName: string, inputState: Enum.UserInputState): void {
		const gameCharacter = this.getGameCharacter();
		if (!gameCharacter) return;

		const tool = gameCharacter.getCurrentTool();
		if (!tool) return;

		const isPrimaryAction = actionName === "PrimaryToolAction";
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
