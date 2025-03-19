import React from "@rbxts/react";
import { Frame, TextButton } from "client/ui/elements/base";
import GameClock from "client/ui/elements/GameClock";

interface SpectatorHUDProps {
	onReturn: () => void;
}

const SpectatorHUD = (props: SpectatorHUDProps): React.Element => {
	return (
		<screengui IgnoreGuiInset={true} ResetOnSpawn={false}>
			<GameClock />
			<frame
				AnchorPoint={new Vector2(0.5, 1)}
				BackgroundTransparency={1}
				Position={UDim2.fromScale(0.5, 0.975)}
				Size={UDim2.fromScale(0, 0.15)}
			>
				<Frame
					anchorPoint={new Vector2(0.5, 0.5)}
					position={UDim2.fromScale(0.5, 0.5)}
					size={UDim2.fromScale(0.75, 1)}
				>
					<TextButton
						anchorPoint={new Vector2(1, 0)}
						backgroundTransparency={1}
						position={UDim2.fromScale(1, 0)}
						size={UDim2.fromScale(0.1, 0.33)}
						text="X"
						event={{ Activated: props.onReturn }}
					/>
				</Frame>
				<uiaspectratioconstraint
					AspectRatio={4}
					AspectType={Enum.AspectType.ScaleWithParentSize}
					DominantAxis={Enum.DominantAxis.Height}
				/>
			</frame>
		</screengui>
	);
};

export default SpectatorHUD;
