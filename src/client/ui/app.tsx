import { useFlameworkDependency } from "@rbxts/flamework-react-utils";
import React, { useEffect, useState } from "@rbxts/react";
import { StarterGui } from "@rbxts/services";
import { RoundTracker } from "client/controllers";
import { GameState } from "shared/types";
import { ChampionStage, GameMap } from "shared/types/workspaceTypes";
import RoundHUD from "./screens/round";
import LobbyHUD from "./screens/lobby";
import PostRoundScreen from "./screens/PostRoundScreen";

StarterGui.SetCoreGuiEnabled(Enum.CoreGuiType.Backpack, false);

const App = (): React.Element => {
	const roundTracker = useFlameworkDependency<RoundTracker>();

	const [gameState, setGameState] = useState(roundTracker.gameState);

	const [teams, setTeams] = useState<[Team, Team] | undefined>();
	const [gameMap, setGameMap] = useState<GameMap | undefined>();

	const [postRoundInfo, setPostRoundInfo] = useState<
		[Team, Array<[string, string, string]>, ChampionStage] | undefined
	>();

	useEffect(() => {
		const connections: Array<RBXScriptConnection> = [
			roundTracker.GameStateChanged.Connect((gameState) => {
				setGameState(gameState);

				if (gameState === GameState.Round) {
					setTeams(roundTracker.getTeams());
					setGameMap(roundTracker.getGameMap());
				} else if (gameState === GameState.PostRound) {
					setPostRoundInfo(roundTracker.getPostRoundInfo());
				}
			}),
		];
		return () => connections.forEach((connection) => connection.Disconnect());
	}, []);

	switch (gameState) {
		case GameState.WaitingForPlayers:
		case GameState.Intermission:
			return <LobbyHUD />;
		case GameState.Round:
			if (!teams) {
				warn("Teams not set");
				return <></>;
			}
			return <RoundHUD team1={teams[0]} team2={teams[1]} />;
		case GameState.PostRound:
			if (!gameMap || !postRoundInfo) {
				warn("Post round info not set");
				return <></>;
			}
			return (
				<PostRoundScreen
					startCFrame={gameMap.CameraPos.GetPivot()}
					winningTeam={postRoundInfo[0]}
					championData={postRoundInfo[1]}
					championStage={postRoundInfo[2]}
				/>
			);
	}
};

export default App;
