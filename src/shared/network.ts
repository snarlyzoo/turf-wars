import { Networking } from "@flamework/networking";
import { CharacterType, HumanoidCharacterInstance } from "shared/types/characterTypes";
import { ProjectileHitType, ProjectileRecord } from "shared/types/projectileTypes";
import { ToolType } from "shared/types/toolTypes";

export const TILT_UPDATE_SEND_RATE: number = 0.1;

export const CHARACTER_EVENT_RATE_LIMIT: number = 0.1;
export const TOOL_EVENT_RATE_LIMIT: number = 0.05;

interface ClientToServerEvents {
	UpdateCharacterTilt: Networking.Unreliable<(angle: number) => void>;

	EquipTool(toolType: ToolType): void;

	DamageBlock(block: BasePart): void;

	FireProjectile(origin: Vector3, direction: Vector3, speed: number, timestamp: number): void;
	RegisterProjectileHit(
		hitType: ProjectileHitType,
		hitPart: BasePart,
		hitTimestamp: number,
		firedTimestamp: number,
	): void;
}

interface ServerToClientEvents {
	RoundStarting(team1: Team, team2: Team): void;
	SetGameClock(time: number, phaseName: string): void;

	TurfChanged(team1Turf: number): void;

	SetCombatEnabled(enabled: boolean): void;
	SetCharacterType(characterType: CharacterType): void;

	CharacterTiltChanged: Networking.Unreliable<(character: HumanoidCharacterInstance, angle?: number) => void>;
	ProjectileFired: Networking.Unreliable<(caster: Player, projectileRecord: ProjectileRecord) => void>;
}

interface ClientToServerFunctions {
	PlaceBlock(position: Vector3): boolean;
}

interface ServerToClientFunctions {}

export const GlobalEvents = Networking.createEvent<ClientToServerEvents, ServerToClientEvents>();
export const GlobalFunctions = Networking.createFunction<ClientToServerFunctions, ServerToClientFunctions>();
