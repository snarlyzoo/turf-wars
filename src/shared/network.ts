import { Networking } from "@flamework/networking";
import { ToolType, TWCharacterInstance } from "./types";

interface ClientToServerEvents {
	UpdateCharacterTilt: Networking.Unreliable<(angle: number) => void>;

	EquipTool(toolType: ToolType): void;
	UnequipCurrentTool(): void;
}

interface ServerToClientEvents {
	CharacterTiltChanged: Networking.Unreliable<(character: TWCharacterInstance, angle: number) => void>;
}

interface ClientToServerFunctions {}

interface ServerToClientFunctions {}

export const GlobalEvents = Networking.createEvent<ClientToServerEvents, ServerToClientEvents>();
export const GlobalFunctions = Networking.createFunction<ClientToServerFunctions, ServerToClientFunctions>();
