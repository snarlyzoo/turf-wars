import React from "@rbxts/react";
import { RoundHUD, ToolHUD } from "./screens";

const App = (): React.Element => {
	return (
		<screengui IgnoreGuiInset={true} ResetOnSpawn={false}>
			<RoundHUD />
			<ToolHUD />
		</screengui>
	);
};

export default App;
