import { atom } from "@rbxts/charm";

export enum GameStateType {
	WaitingForPlayers = "Waiting for players",
	Intermission = "Intermission...",
	Round = "Round",
	PostRound = "Post-round",
}

interface GameState {
	type: GameStateType;
	time: number;
}

export const gameStateAtom = atom<GameState>({ type: GameStateType.WaitingForPlayers, time: 0 });

let currentTimerId = 0;
export function startIntermissionTimer(time: number): void {
	gameStateAtom({ type: GameStateType.Intermission, time: time });
	const timerId = ++currentTimerId;

	const tick = (): void => {
		if (timerId !== currentTimerId) return;

		gameStateAtom((state) => {
			if (state.time > 0) {
				task.delay(1, tick);
				return { ...state, time: state.time - 1 };
			}
			return state;
		});
	};
	task.delay(1, tick);
}
export function startWaitingForPlayersTimer(): void {
	gameStateAtom({ type: GameStateType.WaitingForPlayers, time: 0 });
	const timerId = ++currentTimerId;

	const tick = (): void => {
		if (timerId !== currentTimerId) return;

		gameStateAtom((state) => {
			task.delay(1, tick);
			return { ...state, time: state.time + 1 };
		});
	};
	task.delay(1, tick);
}

export function setGameStateType(stateType: GameStateType): void {
	gameStateAtom({ type: stateType, time: 0 });
	currentTimerId++;
}
