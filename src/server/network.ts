import { Networking } from "@flamework/networking";
import { Players, Workspace } from "@rbxts/services";
import {
	CHARACTER_EVENT_RATE_LIMIT,
	TILT_UPDATE_SEND_RATE,
	TOOL_EVENT_RATE_LIMIT,
	GlobalEvents,
	GlobalFunctions,
} from "shared/network";

export const PING_ERROR_TOLERANCE: number = 0.05;
export const ORIGIN_ERROR_TOLERANCE: number = 4;

const RATE_LIMIT_TOLERANCE: number = 0.02;

function limitEventRate<I extends Array<unknown>>(maxRate: number): Networking.EventMiddleware<I> {
	const playerLastTimeMap: Map<number, Map<string, number>> = new Map();

	Players.PlayerRemoving.Connect((player) => {
		playerLastTimeMap.delete(player.UserId);
	});

	return (processNext, event) => {
		return (player, ...args) => {
			if (!player) return;

			let eventLastTimeMap = playerLastTimeMap.get(player.UserId);
			if (!eventLastTimeMap) {
				eventLastTimeMap = new Map();
				playerLastTimeMap.set(player.UserId, eventLastTimeMap);
			}

			const now = tick();
			if (now - (eventLastTimeMap.get(event.name) ?? 0) >= maxRate - RATE_LIMIT_TOLERANCE) {
				eventLastTimeMap.set(event.name, now);
				processNext(player, ...args);
			} else {
				warn(`${player.Name} fired ${event.name} too quickly`);
			}
		};
	};
}

function validateEventTimestamp<I extends Array<unknown>>(argIndex: number): Networking.EventMiddleware<I> {
	return (processNext, event) => {
		return (player, ...args) => {
			if (!player) return;

			const timestamp = args[argIndex] as number;
			const serverTimestamp = Workspace.GetServerTimeNow();
			if (
				timestamp > serverTimestamp ||
				serverTimestamp - timestamp > player.GetNetworkPing() + PING_ERROR_TOLERANCE
			) {
				warn(`${player.Name} fired ${event.name} with an invalid timestamp`);
				return;
			}

			processNext(player, ...args);
		};
	};
}

function limitFunctionRate<I extends Array<unknown>, O>(maxRate: number): Networking.FunctionMiddleware<I, O> {
	const playerLastTimeMap: Map<number, Map<string, number>> = new Map();

	Players.PlayerRemoving.Connect((player) => {
		playerLastTimeMap.delete(player.UserId);
	});

	return (processNext, func) => {
		return async (player, ...args) => {
			if (!player) return Networking.Skip;

			let funcLastTimeMap = playerLastTimeMap.get(player.UserId);
			if (!funcLastTimeMap) {
				funcLastTimeMap = new Map();
				playerLastTimeMap.set(player.UserId, funcLastTimeMap);
			}

			const now = tick();
			if (now - (funcLastTimeMap.get(func.name) ?? 0) >= maxRate - RATE_LIMIT_TOLERANCE) {
				funcLastTimeMap.set(func.name, now);
				return processNext(player, ...args);
			} else {
				warn(`${player.Name} fired ${func.name} too quickly`);
				return Networking.Skip;
			}
		};
	};
}

export const Events = GlobalEvents.createServer({
	middleware: {
		UpdateCharacterTilt: [limitEventRate(TILT_UPDATE_SEND_RATE)],

		EquipTool: [limitEventRate(CHARACTER_EVENT_RATE_LIMIT)],
		UnequipCurrentTool: [limitEventRate(CHARACTER_EVENT_RATE_LIMIT)],

		DamageBlock: [limitEventRate(TOOL_EVENT_RATE_LIMIT)],

		FireProjectile: [limitEventRate(TOOL_EVENT_RATE_LIMIT), validateEventTimestamp(3)],
		RegisterProjectileHit: [limitEventRate(TOOL_EVENT_RATE_LIMIT), validateEventTimestamp(2)],
	},
});
export const Functions = GlobalFunctions.createServer({
	middleware: {
		PlaceBlock: [limitFunctionRate(TOOL_EVENT_RATE_LIMIT)],
	},
});
