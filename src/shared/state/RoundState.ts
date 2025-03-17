import { atom } from "@rbxts/charm";
import { GameMap } from "shared/types/workspaceTypes";

export enum PhaseType {
	RoundStart = "Round starting...",
	Build = "Build phase",
	Combat = "Combat phase",
}

interface RoundState {
	phase: PhaseType;
	time: number;

	team1: Team;
	team2: Team;

	gameMap: Instance;

	team1Turf: number;

	combatEnabled: boolean;
	turfPerKill: number;
}

export const roundStateAtom = atom<RoundState | undefined>();

let currentTimerId = 0;
const startTimer = (time: number): void => {
	const timerId = ++currentTimerId;
	roundStateAtom((state) => state && { ...state, time });

	const tick = (): void => {
		if (timerId !== currentTimerId) return;

		roundStateAtom((state) => {
			if (!state) return;

			if (state.time > 0) {
				task.delay(1, tick);
				return { ...state, time: state.time - 1 };
			}
			return state;
		});
	};
	task.delay(1, tick);
};

export function getRoundState(): RoundState | undefined {
	const roundState = roundStateAtom();
	if (!roundState) {
		warn("Round has not been started");
		return;
	}
	return roundState;
}

export function initRoundState(team1: Team, team2: Team, gameMap: GameMap): void {
	roundStateAtom({
		phase: PhaseType.Build,
		time: 0,
		team1,
		team2,
		gameMap,
		team1Turf: 0,
		combatEnabled: false,
		turfPerKill: 1,
	});
}

export function clearRoundState(): void {
	roundStateAtom(undefined);
}

export function setPhase(phase: PhaseType, time: number = 0): void {
	roundStateAtom((state) => state && { ...state, phase, time });
	startTimer(time);
}

export function setTeam1Turf(team1Turf: number): void {
	roundStateAtom((state) => state && { ...state, team1Turf });
}

export function setCombatEnabled(combatEnabled: boolean, turfPerKill: number = 1): void {
	roundStateAtom((state) => state && { ...state, combatEnabled, turfPerKill });
}
