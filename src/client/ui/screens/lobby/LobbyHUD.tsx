import React from "@rbxts/react";
import GameClock from "client/ui/elements/GameClock";

const LobbyHUD = (): React.Element => {
	return (
		<screengui IgnoreGuiInset={true}>
			<GameClock />
		</screengui>
	);
};

export default LobbyHUD;
