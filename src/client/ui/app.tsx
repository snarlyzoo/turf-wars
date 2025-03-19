import { useFlameworkDependency } from "@rbxts/flamework-react-utils";
import React, { useEffect, useState } from "@rbxts/react";
import { useAtom } from "@rbxts/react-charm";
import { StarterGui, Teams } from "@rbxts/services";
import { CharacterController } from "client/controllers";
import { Events } from "client/network";
import { GameStateType, gameStateAtom } from "shared/state/GameState";
import LobbyHUD from "./screens/lobby";
import RoundHUD from "./screens/round";
import PostRoundScreen from "./screens/PostRoundScreen";

const Spectators = Teams.FindFirstChild("Spectators") as Team;

StarterGui.SetCoreGuiEnabled(Enum.CoreGuiType.Backpack, false);

const App = (): React.Element => {
	const gameStateType = useAtom(gameStateAtom).type;

	const [postRoundInfo, setPostRoundInfo] = useState<[Team, Array<[string, string, string]>] | undefined>();

	const characterController = useFlameworkDependency<CharacterController>();
	const [team, setTeam] = useState(characterController.team);

	useEffect(() => {
		const connections: Array<RBXScriptConnection> = [
			Events.RoundEnded.connect((winningTeam, championData) => setPostRoundInfo([winningTeam, championData])),
			characterController.TeamChanged.Connect((newTeam) => setTeam(newTeam)),
		];
		return () => connections.forEach((connection) => connection.Disconnect());
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
			return team === Spectators ? <LobbyHUD /> : <RoundHUD />;
		case GameStateType.PostRound:
			if (!postRoundInfo) return <></>;
			return <PostRoundScreen winningTeam={postRoundInfo![0]} championData={postRoundInfo![1]} />;
	}
};

export default App;
