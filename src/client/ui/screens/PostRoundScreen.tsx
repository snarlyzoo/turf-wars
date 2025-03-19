import React, { useEffect } from "@rbxts/react";
import { useAtom } from "@rbxts/react-charm";
import { Players, Workspace } from "@rbxts/services";
import { TextLabel } from "client/ui/elements/base";
import { ChampionTitle } from "client/ui/elements/post-round";
import { roundStateAtom } from "shared/state/RoundState";
import { GameMap } from "shared/types/workspaceTypes";

const FIELD_OF_VIEW = 70;

const player = Players.LocalPlayer;

interface PostRoundScreenProps {
	camera: Camera;
	winningTeam: Team;
	championData: Array<[string, string, string]>;
}

const PostRoundScreen = (props: PostRoundScreenProps): React.Element => {
	const roundState = useAtom(roundStateAtom);
	if (!roundState) return <></>;

	const championStage = (roundState.gameMap as GameMap)[
		props.winningTeam === roundState.team1 ? "Team1Spawn" : "Team2Spawn"
	].ChampionStage;

	useEffect(() => {
		props.camera.CameraType = Enum.CameraType.Scriptable;
		props.camera.FieldOfView = FIELD_OF_VIEW;
		props.camera.CFrame = championStage.CameraPos.GetPivot();

		const humanoid = player.Character?.FindFirstChildOfClass("Humanoid");
		if (humanoid) humanoid.AutoRotate = false;
	}, []);

	const positions = [
		championStage.Positions.First,
		championStage.Positions.Second,
		championStage.Positions.Third,
		championStage.Positions.Fourth,
		championStage.Positions.Fifth,
	];
	const alignments: Array<"Top" | "Bottom"> = ["Bottom", "Top", "Top", "Bottom", "Bottom"];

	return (
		<>
			<screengui IgnoreGuiInset={true} ResetOnSpawn={false}>
				<TextLabel
					anchorPoint={new Vector2(0.5, 1)}
					position={UDim2.fromScale(0.5, 1)}
					size={UDim2.fromScale(1, 0.2)}
					richText={true}
					text={`<b><font color="#${props.winningTeam.TeamColor.Color.ToHex()}">${
						props.winningTeam.Name
					}</font> Wins!</b>`}
				/>
			</screengui>
			{props.championData.map((data, index) => (
				<ChampionTitle
					adornee={positions[index]}
					alignment={alignments[index]}
					username={data[0]}
					award={data[1]}
					message={data[2]}
				/>
			))}
		</>
	);
};

export default PostRoundScreen;
