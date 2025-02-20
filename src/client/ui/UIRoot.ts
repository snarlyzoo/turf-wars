import React from "@rbxts/react";
import { createRoot } from "@rbxts/react-roblox";
import { Players } from "@rbxts/services";
import App from "./app";

const player = Players.LocalPlayer;

export function mountUI(): void {
	const playerGui = player.FindFirstChild("PlayerGui");
	if (!playerGui) error("PlayerGui not found");

	const root = createRoot(playerGui);
	root.render(React.createElement(App));
}
