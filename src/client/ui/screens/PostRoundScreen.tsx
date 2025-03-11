import React, { useEffect } from "@rbxts/react";
import { Players, TweenService, Workspace } from "@rbxts/services";
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
	startCFrame: CFrame;
	winningTeam: Team;
	championData: Array<[string, string, string]>;
	championStage: ChampionStage;
}

const PostRoundScreen = (props: PostRoundScreenProps): React.Element => {
	useEffect(() => {
		const camera = fetchCamera();
		if (!camera) return;
		camera.CFrame = props.startCFrame;

		const humanoid = player.Character?.FindFirstChildOfClass("Humanoid");
		if (humanoid) humanoid.AutoRotate = false;

		const tweenInfo = new TweenInfo(3, Enum.EasingStyle.Quad, Enum.EasingDirection.Out);
		const tween = TweenService.Create(camera, tweenInfo, {
			CFrame: props.championStage.CameraPos.GetPivot(),
		});

		task.delay(MAP_HOLD_TIME, () => tween.Play());
	}, []);

	return <screengui IgnoreGuiInset={true}></screengui>;
};

export default PostRoundScreen;
