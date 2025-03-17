import React from "@rbxts/react";
import { useAtom } from "@rbxts/react-charm";
import { gameStateAtom } from "shared/state/GameState";
import { roundStateAtom } from "shared/state/RoundState";

const formatTime = (time: number): string => {
	const minutes = math.floor(time / 60);
	const seconds = time % 60;
	return string.format("%02d:%02d", minutes, seconds);
};

interface GameClockProps {
	children?: React.Element;
}

const GameClock = (props: GameClockProps): React.Element => {
	const gameState = useAtom(gameStateAtom);
	const roundState = useAtom(roundStateAtom);

	return (
		<frame
			AnchorPoint={new Vector2(0.5, 0)}
			BackgroundColor3={new Color3(0, 0, 0)}
			BackgroundTransparency={0.5}
			BorderSizePixel={0}
			Position={UDim2.fromScale(0.5, 0)}
			Size={UDim2.fromScale(0.2, 0)}
		>
			<textlabel
				AnchorPoint={new Vector2(0.5, 0)}
				BackgroundTransparency={1}
				Position={UDim2.fromScale(0.5, 0)}
				Size={UDim2.fromScale(1, 0.75)}
				Font={Enum.Font.Arcade}
				RichText={true}
				Text={`<b>${formatTime(roundState ? roundState.time : gameState.time)}</b>`}
				TextColor3={new Color3(1, 1, 1)}
				TextScaled={true}
			/>
			<textlabel
				AnchorPoint={new Vector2(0.5, 1)}
				BackgroundTransparency={1}
				Position={UDim2.fromScale(0.5, 0.9)}
				Size={UDim2.fromScale(1, 0.25)}
				Font={Enum.Font.Arcade}
				Text={roundState ? roundState.phase : gameState.type}
				TextColor3={new Color3(1, 1, 1)}
				TextScaled={true}
			/>
			{props.children}
			<uiaspectratioconstraint
				AspectRatio={3}
				AspectType={Enum.AspectType.ScaleWithParentSize}
				DominantAxis={Enum.DominantAxis.Width}
			/>
		</frame>
	);
};

export default GameClock;
