import { useFlameworkDependency } from "@rbxts/flamework-react-utils";
import React from "@rbxts/react";
import { useAtom } from "@rbxts/react-charm";
import { CharacterController } from "client/controllers";
import { BlockGrid } from "shared/modules";
import { gameStateAtom } from "shared/state/GameState";
import { roundStateAtom } from "shared/state/RoundState";
import { Frame, TextLabel } from "./base";
import ProgressBar from "./ProgressBar";

const formatTime = (time: number): string => {
	const minutes = math.floor(time / 60);
	const seconds = time % 60;
	return string.format("%02d:%02d", minutes, seconds);
};

const GameClock = (): React.Element => {
	const gameState = useAtom(gameStateAtom);
	const roundState = useAtom(roundStateAtom);

	const characterController = useFlameworkDependency<CharacterController>();

	let turfProgressBar: React.Element | undefined;
	if (roundState) {
		const isTeam2 = characterController.team === roundState.team2;
		const [myTeam, enemyTeam] = isTeam2
			? [roundState.team2, roundState.team1]
			: [roundState.team1, roundState.team2];

		turfProgressBar = (
			<ProgressBar
				anchorPoint={new Vector2(0.5, 0)}
				backgroundColor={enemyTeam.TeamColor.Color}
				position={UDim2.fromScale(0.5, 1)}
				size={UDim2.fromScale(1, 0.25)}
				progressColor={myTeam.TeamColor.Color}
				textVisible={true}
				textAlignment="Progress"
				value={isTeam2 ? BlockGrid.DIMENSIONS.X - roundState.team1Turf : roundState.team1Turf}
				maxValue={BlockGrid.DIMENSIONS.X}
			/>
		);
	}

	return (
		<Frame anchorPoint={new Vector2(0.5, 0)} position={UDim2.fromScale(0.5, 0)} size={UDim2.fromScale(0.2, 0)}>
			<TextLabel
				anchorPoint={new Vector2(0.5, 0)}
				backgroundTransparency={1}
				position={UDim2.fromScale(0.5, 0)}
				size={UDim2.fromScale(1, 0.75)}
				richText={true}
				text={`<b>${formatTime(roundState ? roundState.time : gameState.time)}</b>`}
			/>
			<TextLabel
				anchorPoint={new Vector2(0.5, 1)}
				backgroundTransparency={1}
				position={UDim2.fromScale(0.5, 0.9)}
				size={UDim2.fromScale(1, 0.25)}
				text={roundState ? roundState.phase : gameState.type}
			/>
			{turfProgressBar}
			<uiaspectratioconstraint
				AspectRatio={3}
				AspectType={Enum.AspectType.ScaleWithParentSize}
				DominantAxis={Enum.DominantAxis.Width}
			/>
		</Frame>
	);
};

export default GameClock;
