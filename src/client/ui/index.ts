import React from "@rbxts/react";
import { createRoot, Root } from "@rbxts/react-roblox";
import { Players } from "@rbxts/services";
import App from "./app";

const playerGui = Players.LocalPlayer.FindFirstChildOfClass("PlayerGui") as PlayerGui;
if (!playerGui) error("Player gui not found");

let root: Root | undefined;

export function mountUI(): void {
	if (!root) root = createRoot(playerGui);
	root.render(React.createElement(App));
}

export function unmountUI(): void {
	if (root) {
		root.unmount();
		root = undefined;
	}
}
