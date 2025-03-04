import { useFlameworkDependency } from "@rbxts/flamework-react-utils";
import React, { useEffect, useState } from "@rbxts/react";
import { RoundTracker } from "client/controllers";

const formatTime = (time: number): string => {
	const minutes = math.floor(time / 60);
	const seconds = time % 60;
	return string.format("%02d:%02d", minutes, seconds);
};

interface GameClockProps {
	children?: React.Element;
}

const GameClock = (props: GameClockProps): React.Element => {
	const roundTracker = useFlameworkDependency<RoundTracker>();
	const [time, setTime] = useState(roundTracker.time);
	const [stateName, setStateName] = useState(roundTracker.stateName);

	useEffect(() => {
		const connection = roundTracker.GameClockChanged.Connect(() => {
			setTime(roundTracker.time);
			setStateName(roundTracker.stateName);
		});
		return () => connection.Disconnect();
	}, []);

	useEffect(() => {
		if (time <= 0) return;
		const interval = task.delay(1, () => setTime(time - 1));
		return () => task.cancel(interval);
	}, [time]);

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
				Text={`<b>${formatTime(time)}</b>`}
				TextColor3={new Color3(1, 1, 1)}
				TextScaled={true}
			/>
			<textlabel
				AnchorPoint={new Vector2(0.5, 1)}
				BackgroundTransparency={1}
				Position={UDim2.fromScale(0.5, 0.9)}
				Size={UDim2.fromScale(1, 0.25)}
				Font={Enum.Font.Arcade}
				Text={stateName}
				TextColor3={new Color3(1, 1, 1)}
				TextScaled={true}
			/>
			{props.children}
			<uiaspectratioconstraint
				AspectRatio={2.75}
				AspectType={Enum.AspectType.ScaleWithParentSize}
				DominantAxis={Enum.DominantAxis.Width}
			/>
		</frame>
	);
};

export default GameClock;
