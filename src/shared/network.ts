import { Networking } from "@flamework/networking";
import { SyncPayload } from "@rbxts/charm-sync";
import { gameStateAtom } from "shared/state/GameState";
import { roundStateAtom } from "shared/state/RoundState";
import { CharacterType, HumanoidCharacterInstance } from "shared/types/characterTypes";
import { ProjectileHitType, ProjectileRecord } from "shared/types/projectileTypes";
import { ToolType } from "shared/types/toolTypes";

export const TILT_UPDATE_SEND_RATE: number = 0.1;

export const CHARACTER_EVENT_RATE_LIMIT: number = 0.1;
export const TOOL_EVENT_RATE_LIMIT: number = 0.05;

interface ClientToServerEvents {
	RequestState(): void;

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
	SyncState(payload: SyncPayload<typeof AtomsToSync>): void;

	RoundEnded(winningTeam: Team, championData: Array<[string, string, string]>): void;

	SetCharacterType(characterType: CharacterType): void;
	SetBlockCount(count: number): void;
	SetProjectileCount(count: number): void;

	CharacterTiltChanged: Networking.Unreliable<(character: HumanoidCharacterInstance, angle?: number) => void>;

	ProjectileFired: Networking.Unreliable<
		(caster: Player, projectileRecord: ProjectileRecord, pvInstance: PVInstance) => void
	>;
}

interface ClientToServerFunctions {
	PlaceBlock(position: Vector3): boolean;
}

interface ServerToClientFunctions {}

export const AtomsToSync = { gameStateAtom, roundStateAtom };

export const GlobalEvents = Networking.createEvent<ClientToServerEvents, ServerToClientEvents>();
export const GlobalFunctions = Networking.createFunction<ClientToServerFunctions, ServerToClientFunctions>();
