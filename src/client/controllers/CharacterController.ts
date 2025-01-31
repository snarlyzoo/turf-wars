import { Components } from "@flamework/components";
import { Controller, OnStart } from "@flamework/core";
import { ContextActionService, Players } from "@rbxts/services";
import { CharacterComponent, GameCharacterComponent, LobbyCharacterComponent } from "client/components/characters";
import { Events } from "client/network";
import { CHARACTER_EVENT_RATE_LIMIT, TOOL_EVENT_RATE_LIMIT } from "shared/network";
import { CharacterType } from "shared/types/characterTypes";
import { ToolType } from "shared/types/toolTypes";

enum GameInputAction {
	EquipPrimary = "EquipPrimary",
	EquipSecondary = "EquipSecondary",
	PrimaryToolAction = "PrimaryToolAction",
	SecondaryToolAction = "SecondaryToolAction",
}

@Controller()
export class CharacterController implements OnStart {
	public readonly player: Player = Players.LocalPlayer;

	private combatEnabled: boolean = false;

	private characterComponent?: CharacterComponent;

	private lastCharacterEventTick: number = 0;
	private lastToolEventTick: number = 0;

	public constructor(private components: Components) {}

	public onStart(): void {
		Events.ConstructCharacterComponent.connect((characterType) =>
			this.onConstructCharacterComponent(characterType),
		);
		Events.SetCombatEnabled.connect((enabled) => this.onSetCombatEnabled(enabled));

		this.player.CharacterRemoving.Connect((character) => this.onCharacterRemoving(character));
	}

	private bindGameInputActions(): void {
		ContextActionService.BindAction(
			GameInputAction.EquipPrimary,
			(actionName, inputState) => this.onEquipAction(actionName, inputState),
			false,
			Enum.KeyCode.One,
		);
		ContextActionService.BindAction(
			GameInputAction.EquipSecondary,
			(actionName, inputState) => this.onEquipAction(actionName, inputState),
			false,
			Enum.KeyCode.Two,
		);

		ContextActionService.BindAction(
			GameInputAction.PrimaryToolAction,
			(actionName, inputState) => this.onToolAction(actionName, inputState),
			false,
			Enum.UserInputType.MouseButton1,
		);
		ContextActionService.BindAction(
			GameInputAction.SecondaryToolAction,
			(actionName, inputState) => this.onToolAction(actionName, inputState),
			false,
			Enum.UserInputType.MouseButton2,
		);
	}
	private unbindGameInputActions(): void {
		ContextActionService.UnbindAction(GameInputAction.EquipPrimary);
		ContextActionService.UnbindAction(GameInputAction.EquipSecondary);

		ContextActionService.UnbindAction(GameInputAction.PrimaryToolAction);
		ContextActionService.UnbindAction(GameInputAction.SecondaryToolAction);
	}

	private onConstructCharacterComponent(characterType: CharacterType): void {
		const character = this.player.Character;
		if (!character) {
			warn("Local player does not have a character");
			return;
		}

		print(`Constructing ${characterType} character component...`);

		let characterComponent: CharacterComponent;
		if (characterType === CharacterType.Game) {
			characterComponent = this.components.addComponent<GameCharacterComponent>(character);
			(characterComponent as GameCharacterComponent).combatEnabled = this.combatEnabled;
			this.bindGameInputActions();
		} else {
			characterComponent = this.components.addComponent<LobbyCharacterComponent>(character);
		}
		this.characterComponent = characterComponent;

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
			this.unbindGameInputActions();
		} else {
			this.components.removeComponent<LobbyCharacterComponent>(character);
		}
		this.characterComponent = undefined;
	}

	private onEquipAction(actionName: string, inputState: Enum.UserInputState): void {
		if (!(this.characterComponent instanceof GameCharacterComponent)) return;

		if (inputState === Enum.UserInputState.Begin) {
			const tick = os.clock();
			if (tick - this.lastCharacterEventTick < CHARACTER_EVENT_RATE_LIMIT) return;
			this.lastCharacterEventTick = tick;

			this.characterComponent.equipTool(actionName === "EquipPrimary" ? ToolType.Slingshot : ToolType.Hammer);
		}
	}

	private onToolAction(actionName: string, inputState: Enum.UserInputState): void {
		if (!(this.characterComponent instanceof GameCharacterComponent)) return;

		const tool = this.characterComponent.getCurrentTool();
		if (!tool) return;

		const isPrimaryAction = actionName === "PrimaryToolAction";
		if (inputState === Enum.UserInputState.Begin) {
			const tick = os.clock();
			if (tick - this.lastToolEventTick < TOOL_EVENT_RATE_LIMIT) return;
			this.lastToolEventTick = tick;

			isPrimaryAction ? tool.usePrimaryAction(true) : tool.useSecondaryAction();
		} else if (inputState === Enum.UserInputState.End && isPrimaryAction) {
			tool.usePrimaryAction(false);
		}
	}
}
