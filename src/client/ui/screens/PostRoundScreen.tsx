import React, { useEffect } from "@rbxts/react";
import { Players, TweenService, Workspace } from "@rbxts/services";
import ChampionTitle from "client/ui/elements/ChampionTitle";
import { ChampionStage } from "shared/types/workspaceTypes";

const FIELD_OF_VIEW = 70;
const MAP_HOLD_TIME = 2;

const player = Players.LocalPlayer;

function fetchCamera(): Camera | undefined {
	const camera = Workspace.CurrentCamera;
	if (!camera) {
		warn("No camera found");
		return;
	}

	camera.CameraType = Enum.CameraType.Scriptable;
	camera.FieldOfView = FIELD_OF_VIEW;

	return camera;
}

interface PostRoundScreenProps {
	winningTeam: Team;
	championData: Array<[string, string, string]>;
	championStage: ChampionStage;
}

const PostRoundScreen = (props: PostRoundScreenProps): React.Element => {
	useEffect(() => {
		const camera = fetchCamera();
		if (!camera) return;
		camera.CFrame = props.championStage.CameraPos.GetPivot();

		const humanoid = player.Character?.FindFirstChildOfClass("Humanoid");
		if (humanoid) humanoid.AutoRotate = false;
	}, []);

	const positions = [
		props.championStage.Positions.First,
		props.championStage.Positions.Second,
		props.championStage.Positions.Third,
		props.championStage.Positions.Fourth,
		props.championStage.Positions.Fifth,
	];
	const alignments: Array<"Top" | "Bottom"> = ["Bottom", "Top", "Top", "Bottom", "Bottom"];

	return (
		<>
			<screengui IgnoreGuiInset={true}>
				<textlabel
					AnchorPoint={new Vector2(0.5, 1)}
					BackgroundColor3={new Color3(0, 0, 0)}
					BackgroundTransparency={0.5}
					BorderSizePixel={0}
					Position={UDim2.fromScale(0.5, 1)}
					Size={UDim2.fromScale(1, 0.2)}
					Font={Enum.Font.Arcade}
					RichText={true}
					Text={`<b><font color="#${props.winningTeam.TeamColor.Color.ToHex()}">${
						props.winningTeam.Name
					}</font> Wins!</b>`}
					TextColor3={new Color3(1, 1, 1)}
					TextScaled={true}
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
