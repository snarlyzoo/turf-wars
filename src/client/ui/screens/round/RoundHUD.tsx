import React from "@rbxts/react";
import GameClock from "client/ui/elements/GameClock";
import ProgressBar from "client/ui/elements/ProgressBar";
import { BlockGrid } from "shared/modules";
import { roundStateAtom } from "shared/state/RoundState";
import ToolDisplay from "./ToolDisplay";
import ResourceDisplay from "./ResourceDisplay";
import { useAtom } from "@rbxts/react-charm";
import { useFlameworkDependency } from "@rbxts/flamework-react-utils";
import { CharacterController } from "client/controllers";

const RoundHUD = (): React.Element => {
	const roundState = useAtom(roundStateAtom);
	if (!roundState) return <></>;

	const characterController = useFlameworkDependency<CharacterController>();

	const isTeam1 = characterController.team === roundState.team1;
	const [myTeam, enemyTeam] = isTeam1 ? [roundState.team1, roundState.team2] : [roundState.team2, roundState.team1];

	return (
		<screengui IgnoreGuiInset={true} ResetOnSpawn={false}>
			<GameClock>
				<ProgressBar
					anchorPoint={new Vector2(0.5, 0)}
					backgroundColor={enemyTeam.TeamColor.Color}
					position={UDim2.fromScale(0.5, 1)}
					size={UDim2.fromScale(1, 0.25)}
					progressColor={myTeam.TeamColor.Color}
					font={Enum.Font.Arcade}
					textColor={new Color3(1, 1, 1)}
					textVisible={true}
					textAlignment="Progress"
					value={isTeam1 ? roundState.team1Turf : BlockGrid.DIMENSIONS.X - roundState.team1Turf}
					maxValue={BlockGrid.DIMENSIONS.X}
				/>
			</GameClock>
			<frame
				AnchorPoint={new Vector2(0.5, 1)}
				BackgroundTransparency={1}
				Position={UDim2.fromScale(0.5, 1)}
				Size={UDim2.fromScale(1, 0.08)}
			>
				<ToolDisplay />
				<ResourceDisplay />
			</frame>
		</screengui>
	);
};

export default RoundHUD;
