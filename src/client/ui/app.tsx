import React, { useEffect, useState } from "@rbxts/react";
import { useAtom } from "@rbxts/react-charm";
import { StarterGui } from "@rbxts/services";
import { Events } from "client/network";
import { GameStateType, gameStateAtom } from "shared/state/GameState";
import LobbyHUD from "./screens/lobby";
import RoundHUD from "./screens/round";
import PostRoundScreen from "./screens/PostRoundScreen";

StarterGui.SetCoreGuiEnabled(Enum.CoreGuiType.Backpack, false);

const App = (): React.Element => {
	const gameStateType = useAtom(gameStateAtom).type;

	const [postRoundInfo, setPostRoundInfo] = useState<[Team, Array<[string, string, string]>] | undefined>();

	useEffect(() => {
		Events.RoundEnded.connect((winningTeam, championData) => {
			setPostRoundInfo([winningTeam, championData]);
		});
	}, []);

	useEffect(() => {
		if (postRoundInfo && gameStateType !== GameStateType.PostRound) {
			setPostRoundInfo(undefined);
		}
	}, [gameStateType]);

	switch (gameStateType) {
		case GameStateType.WaitingForPlayers:
		case GameStateType.Intermission:
			return <LobbyHUD />;
		case GameStateType.Round:
			return <RoundHUD />;
		case GameStateType.PostRound:
			if (!postRoundInfo) return <></>;
			return <PostRoundScreen winningTeam={postRoundInfo![0]} championData={postRoundInfo![1]} />;
	}
};

export default App;
