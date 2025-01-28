import { Components } from "@flamework/components";
import { Controller, OnStart } from "@flamework/core";
import { ContextActionService, Players } from "@rbxts/services";
import { CharacterComponent, GameCharacterComponent, LobbyCharacterComponent } from "client/components/characters";
import { Events } from "client/network";
import { CharacterType } from "shared/types/characterTypes";
import { ToolType } from "shared/types/toolTypes";

@Controller()
export class CharacterController implements OnStart {
	public readonly player: Player = Players.LocalPlayer;

	private combatEnabled: boolean = false;

	private characterComponent?: CharacterComponent;

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
			"EquipPrimary",
			(actionName, inputState) => this.onEquipAction(actionName, inputState),
			false,
			Enum.KeyCode.One,
		);
		ContextActionService.BindAction(
			"EquipSecondary",
			(actionName, inputState) => this.onEquipAction(actionName, inputState),
			false,
			Enum.KeyCode.Two,
		);

		ContextActionService.BindAction(
			"PrimaryToolAction",
			(actionName, inputState) => this.onToolAction(actionName, inputState),
			false,
			Enum.UserInputType.MouseButton1,
		);
		ContextActionService.BindAction(
			"SecondaryToolAction",
			(actionName, inputState) => this.onToolAction(actionName, inputState),
			false,
			Enum.UserInputType.MouseButton2,
		);
	}
	private unbindGameInputActions(): void {
		ContextActionService.UnbindAction("EquipPrimary");
		ContextActionService.UnbindAction("EquipSecondary");

		ContextActionService.UnbindAction("PrimaryToolAction");
		ContextActionService.UnbindAction("SecondaryToolAction");
	}

	private onConstructCharacterComponent(characterType: CharacterType): void {
		const character = this.player.Character;
		if (!character) {
			warn("Local player does not have a character.");
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

		print(`${characterType} character component constructed.`);
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
			this.characterComponent.equipTool(actionName === "EquipPrimary" ? ToolType.Slingshot : ToolType.Hammer);
		}
	}

	private onToolAction(actionName: string, inputState: Enum.UserInputState): void {
		if (!(this.characterComponent instanceof GameCharacterComponent)) return;

		const tool = this.characterComponent.getCurrentTool();
		if (!tool) return;

		const toActivate = inputState === Enum.UserInputState.Begin;
		if (actionName === "PrimaryToolAction") {
			tool.usePrimaryAction(toActivate);
		} else {
			tool.useSecondaryAction(toActivate);
		}
	}
}
