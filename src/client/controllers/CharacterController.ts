import { Components } from "@flamework/components";
import { Controller, OnStart } from "@flamework/core";
import { ContextActionService, Players } from "@rbxts/services";
import { TWCharacterComponent } from "client/components/characters";
import { ToolType } from "shared/types/toolTypes";

@Controller()
export class CharacterController implements OnStart {
	public readonly player: Player = Players.LocalPlayer;

	private twCharacter?: TWCharacterComponent;

	public constructor(private components: Components) {}

	public onStart(): void {
		if (this.player.Character) this.onCharacterAdded(this.player.Character);

		this.player.CharacterAdded.Connect((character) => this.onCharacterAdded(character));
		this.player.CharacterRemoving.Connect((character) => this.onCharacterRemoving(character));

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

		const toActivate = inputState === Enum.UserInputState.Begin;
		if (actionName === "PrimaryToolAction") {
			tool.usePrimaryAction(toActivate);
		} else {
			tool.useSecondaryAction(toActivate);
		}
	}
}
