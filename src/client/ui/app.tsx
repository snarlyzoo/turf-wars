import React from "@rbxts/react";
import RoundHUD from "./screens";

const App = (): React.Element => {
	return (
		<screengui IgnoreGuiInset={true} ResetOnSpawn={false}>
			<RoundHUD />
		</screengui>
	);
};

export default App;
