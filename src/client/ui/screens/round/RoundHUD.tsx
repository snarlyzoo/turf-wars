import React from "@rbxts/react";
import GameClock from "client/ui/elements/GameClock";
import ToolDisplay from "./ToolDisplay";
import ResourceDisplay from "./ResourceDisplay";

const RoundHUD = (): React.Element => {
	return (
		<screengui IgnoreGuiInset={true} ResetOnSpawn={false}>
			<GameClock />
			<frame
				AnchorPoint={new Vector2(0.5, 1)}
				BackgroundTransparency={1}
				Position={UDim2.fromScale(0.5, 1)}
				Size={UDim2.fromScale(1, 0.08)}
			>
				<ToolDisplay />
				<ResourceDisplay />
			</frame>
		</screengui>
	);
};

export default RoundHUD;
