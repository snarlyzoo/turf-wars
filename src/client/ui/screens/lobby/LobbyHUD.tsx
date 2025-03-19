import React, { useState } from "@rbxts/react";
import { useAtom } from "@rbxts/react-charm";
import { TextButton } from "client/ui/elements/base";
import GameClock from "client/ui/elements/GameClock";
import { gameStateAtom, GameStateType } from "shared/state/GameState";
import SpectatorHUD from "./SpectatorHUD";

const LobbyHUD = (): React.Element => {
	const gameStateType = useAtom(gameStateAtom).type;

	const [isSpectating, setIsSpectating] = useState(false);
	if (isSpectating) return <SpectatorHUD onReturn={(): void => setIsSpectating(false)} />;

	return (
		<screengui IgnoreGuiInset={true} ResetOnSpawn={false}>
			<GameClock />
			{gameStateType === GameStateType.Round && (
				<TextButton
					anchorPoint={new Vector2(1, 0.5)}
					size={UDim2.fromScale(0, 0.05)}
					position={UDim2.fromScale(1, 0.5)}
					text="Spectate"
					event={{ Activated: () => setIsSpectating(true) }}
				>
					<uiaspectratioconstraint
						AspectRatio={5}
						AspectType={Enum.AspectType.ScaleWithParentSize}
						DominantAxis={Enum.DominantAxis.Height}
					/>
				</TextButton>
			)}
		</screengui>
	);
};

export default LobbyHUD;
