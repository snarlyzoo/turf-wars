import { Components } from "@flamework/components";
import { Controller, OnStart } from "@flamework/core";
import { ContextActionService, Players } from "@rbxts/services";
import { TWCharacterComponent } from "client/components/characters";
import { ToolType } from "shared/types/toolTypes";

const player = Players.LocalPlayer;

@Controller()
class CharacterController implements OnStart {
	private twCharacter?: TWCharacterComponent;

	public constructor(private components: Components) {}

	public onStart(): void {
		if (player.Character) {
			this.onCharacterAdded(player.Character);
		}
		player.CharacterAdded.Connect((character) => this.onCharacterAdded(character));
		player.CharacterRemoving.Connect((character) => this.onCharacterRemoving(character));

		this.bindInputActions();
	}

	private bindInputActions(): void {
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

	private onCharacterAdded(character: Model): void {
		print("Constructing character component...");

		this.twCharacter = this.components.addComponent<TWCharacterComponent>(character);

		print("Character component constructed.");
	}

	private onCharacterRemoving(character: Model): void {
		this.components.removeComponent<TWCharacterComponent>(character);
		this.twCharacter = undefined;
	}

	private onEquipAction(actionName: string, inputState: Enum.UserInputState): void {
		if (!this.twCharacter) return;

		if (inputState === Enum.UserInputState.Begin) {
			this.twCharacter.equipTool(actionName === "EquipPrimary" ? ToolType.Slingshot : ToolType.Hammer);
		}
	}

	private onToolAction(actionName: string, inputState: Enum.UserInputState): void {
		if (!this.twCharacter) return;

		const tool = this.twCharacter.getCurrentTool();
		if (!tool) return;

		if (inputState === Enum.UserInputState.Begin) {
			if (actionName === "PrimaryToolAction") {
				tool.usePrimaryAction(true);
			} else {
				tool.useSecondaryAction(true);
			}
		} else if (inputState === Enum.UserInputState.End) {
			if (actionName === "PrimaryToolAction") {
				tool.usePrimaryAction(false);
			} else {
				tool.useSecondaryAction(false);
			}
		}
	}
}
