import { useFlameworkDependency } from "@rbxts/flamework-react-utils";
import React, { useEffect, useState } from "@rbxts/react";
import { Players } from "@rbxts/services";
import { RoundTracker } from "client/controllers";
import GameClock from "client/ui/elements/GameClock";
import ProgressBar from "client/ui/elements/ProgressBar";
import { BlockGrid } from "shared/modules";
import ToolDisplay from "./ToolDisplay";
import ResourceDisplay from "./ResourceDisplay";

const player = Players.LocalPlayer;

interface RoundHUDProps {
	team1: Team;
	team2: Team;
}

const RoundHUD = (props: RoundHUDProps): React.Element => {
	const [myTeam, enemyTeam] = player.Team === props.team1 ? [props.team1, props.team2] : [props.team2, props.team1];

	const roundTracker = useFlameworkDependency<RoundTracker>();
	const [teamTurf, setTeamTurf] = useState(roundTracker.getTeamTurf(myTeam));

	useEffect(() => {
		const connection = roundTracker.TurfChanged.Connect(() => setTeamTurf(roundTracker.getTeamTurf(myTeam)));
		return () => connection.Disconnect();
	}, []);

	return (
		<screengui IgnoreGuiInset={true}>
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
					value={teamTurf}
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
