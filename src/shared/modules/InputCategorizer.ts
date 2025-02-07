import { UserInputService } from "@rbxts/services";
import Signal from "@rbxts/signal";

enum InputCategory {
	KeyboardAndMouse = "KeyboardAndMouse",
	Gamepad = "Gamepad",
	Touch = "Touch",
	Unknown = "Unknown",
}

export abstract class InputCategorizer {
	public static InputCategoryChanged: Signal<(inputCategory: InputCategory) => void> = new Signal();

	private static lastInputCategory: InputCategory = this.getDefaultInputCategory();

	private static initialize = ((): void => {
		UserInputService.LastInputTypeChanged.Connect((inputType) => this.onInputTypeChanged(inputType));
	})();

	public static getLastInputCategory(): InputCategory {
		return this.lastInputCategory;
	}

	private static setLastInputCategory(inputCategory: InputCategory): void {
		if (this.lastInputCategory !== inputCategory) {
			this.lastInputCategory = inputCategory;
			this.InputCategoryChanged.Fire(inputCategory);
		}
	}

	private static getCategoryFromInputType(inputType: Enum.UserInputType): InputCategory {
		if (string.find(inputType.Name, "Gamepad")[0] !== undefined) {
			return InputCategory.Gamepad;
		} else if (inputType === Enum.UserInputType.Keyboard || string.find(inputType.Name, "Mouse")[0]) {
			return InputCategory.KeyboardAndMouse;
		} else if (inputType === Enum.UserInputType.Touch) {
			return InputCategory.Touch;
		}
		return InputCategory.Unknown;
	}

	private static getDefaultInputCategory(): InputCategory {
		const lastInputCategory = this.getCategoryFromInputType(UserInputService.GetLastInputType());
		if (lastInputCategory !== InputCategory.Unknown) return lastInputCategory;

		if (UserInputService.KeyboardEnabled && UserInputService.MouseEnabled) {
			return InputCategory.KeyboardAndMouse;
		} else if (UserInputService.TouchEnabled) {
			return InputCategory.Touch;
		} else if (UserInputService.GamepadEnabled) {
			return InputCategory.Gamepad;
		}

		warn("No input devices detected");
		return InputCategory.Unknown;
	}

	private static onInputTypeChanged(inputType: Enum.UserInputType): void {
		const inputCategory = this.getCategoryFromInputType(inputType);
		if (inputCategory !== InputCategory.Unknown) this.setLastInputCategory(inputCategory);
	}
}
