import { Networking } from "@flamework/networking";
import { HumanoidCharacterInstance } from "shared/types/characterTypes";
import { ProjectileHitType, ProjectileRecord } from "shared/types/projectileTypes";
import { ToolType } from "shared/types/toolTypes";

interface ClientToServerEvents {
	UpdateCharacterTilt: Networking.Unreliable<(angle: number) => void>;

	EquipTool(toolType: ToolType): void;
	UnequipCurrentTool(): void;

	FireProjectile(origin: Vector3, direction: Vector3, speed: number, timestamp: number): void;
	RegisterProjectileHit(
		hitType: ProjectileHitType,
		hitPart: BasePart,
		hitTimestamp: number,
		firedTimestamp: number,
	): void;
}

interface ServerToClientEvents {
	CharacterTiltChanged: Networking.Unreliable<(character: HumanoidCharacterInstance, angle?: number) => void>;

	ProjectileFired: Networking.Unreliable<(caster: Player, projectileRecord: ProjectileRecord) => void>;
}

interface ClientToServerFunctions {}

interface ServerToClientFunctions {}

export const GlobalEvents = Networking.createEvent<ClientToServerEvents, ServerToClientEvents>();
export const GlobalFunctions = Networking.createFunction<ClientToServerFunctions, ServerToClientFunctions>();
