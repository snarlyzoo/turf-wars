import { Networking } from "@flamework/networking";
import { Players } from "@rbxts/services";
import { TILT_SEND_RATE } from "shared/constants";
import { GlobalEvents, GlobalFunctions } from "shared/network";

function limitRateMiddleware<I extends Array<unknown>>(maxRate: number): Networking.EventMiddleware<I> {
	const RATE_LIMIT_TOLERANCE = 0.01;

	const lastTimeMap = new Map<string, Map<number, number>>();

	Players.PlayerRemoving.Connect((player) => {
		lastTimeMap.forEach((eventLastTimeMap) => eventLastTimeMap.delete(player.UserId));
	});

	return (processNext, event) => {
		return (player, ...args) => {
			if (!player) {
				return;
			}

			let eventLastTimeMap = lastTimeMap.get(event.name);
			if (!eventLastTimeMap) {
				eventLastTimeMap = new Map();
				lastTimeMap.set(event.name, eventLastTimeMap);
			}

			const now = tick();
			if (now - (eventLastTimeMap.get(player.UserId) ?? 0) >= maxRate - RATE_LIMIT_TOLERANCE) {
				eventLastTimeMap.set(player.UserId, now);
				processNext(player, ...args);
			}
		};
	};
}

export const Events = GlobalEvents.createServer({
	middleware: {
		UpdateCharacterTilt: [limitRateMiddleware(TILT_SEND_RATE)],
	},
});
export const Functions = GlobalFunctions.createServer({});
