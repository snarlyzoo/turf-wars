import React, { useEffect, useState } from "@rbxts/react";
import { useAtom } from "@rbxts/react-charm";
import { Frame, TextButton, TextLabel } from "client/ui/elements/base";
import GameClock from "client/ui/elements/GameClock";
import { roundStateAtom } from "shared/state/RoundState";

const FIELD_OF_VIEW = 70;

interface SpectatorHUDProps {
	camera: Camera;
	onReturn: () => void;
}

const SpectatorHUD = (props: SpectatorHUDProps): React.Element => {
	const roundState = useAtom(roundStateAtom);

	const [players, setPlayers] = useState<Array<Player>>([]);

	useEffect(() => {
		if (!roundState) {
			props.onReturn();
			return;
		}

		setPlayers([...roundState.team1.GetPlayers(), ...roundState.team2.GetPlayers()]);

		const onPlayerAdded = (player: Player): void => setPlayers((prev) => [...prev, player]);
		const onPlayerRemoved = (player: Player): void => setPlayers((prev) => prev.filter((p) => p !== player));

		const connections = [
			roundState.team1.PlayerAdded.Connect(onPlayerAdded),
			roundState.team1.PlayerRemoved.Connect(onPlayerRemoved),
			roundState.team2.PlayerAdded.Connect(onPlayerAdded),
			roundState.team2.PlayerRemoved.Connect(onPlayerRemoved),
		];
		return () => connections.forEach((connection) => connection.Disconnect());
	}, [roundState]);

	const [selectedPlayerId, setSelectedPlayerId] = useState<number | undefined>(
		players.size() > 0 ? players[0].UserId : undefined,
	);
	useEffect(() => {
		if (players.size() === 0) {
			setSelectedPlayerId(undefined);
		} else if (!players.find((player) => player.UserId === selectedPlayerId)) {
			setSelectedPlayerId(players[0].UserId);
		}
	}, [players]);

	const currentPlayer = players.find((player) => player.UserId === selectedPlayerId);
	useEffect(() => {
		if (!currentPlayer) return;
		const humanoid = currentPlayer.Character?.FindFirstChildOfClass("Humanoid");
		if (humanoid) props.camera.CameraSubject = humanoid;
	}, [currentPlayer]);

	props.camera.FieldOfView = FIELD_OF_VIEW;

	const handlePrev = (): void => {
		if (players.size() === 0) return;
		const curIndex = players.findIndex((player) => player.UserId === selectedPlayerId);
		const newIndex = (curIndex - 1 + players.size()) % players.size();
		setSelectedPlayerId(players[newIndex].UserId);
	};
	const handleNext = (): void => {
		if (players.size() === 0) return;
		const curIndex = players.findIndex((player) => player.UserId === selectedPlayerId);
		const newIndex = (curIndex + 1) % players.size();
		setSelectedPlayerId(players[newIndex].UserId);
	};

	return (
		<screengui IgnoreGuiInset={true} ResetOnSpawn={false}>
			<GameClock />
			<frame
				AnchorPoint={new Vector2(0.5, 1)}
				BackgroundTransparency={1}
				Position={UDim2.fromScale(0.5, 0.975)}
				Size={UDim2.fromScale(0, 0.2)}
			>
				<Frame
					anchorPoint={new Vector2(0.5, 0.5)}
					position={UDim2.fromScale(0.5, 0.5)}
					size={UDim2.fromScale(0.8, 1)}
				>
					<TextButton
						anchorPoint={new Vector2(1, 0)}
						backgroundTransparency={1}
						position={UDim2.fromScale(1, 0)}
						size={UDim2.fromScale(0.05, 0.25)}
						text="X"
						event={{ Activated: props.onReturn }}
					/>
					{currentPlayer ? (
						<>
							<TextLabel
								anchorPoint={new Vector2(0.5, 0)}
								backgroundTransparency={1}
								position={UDim2.fromScale(0.5, 0)}
								size={UDim2.fromScale(0.9, 0.33)}
								text="Spectating"
							/>
							<TextLabel
								anchorPoint={new Vector2(0.5, 1)}
								backgroundTransparency={1}
								position={UDim2.fromScale(0.5, 1)}
								size={UDim2.fromScale(1, 0.67)}
								text={currentPlayer.Name}
								textColor3={currentPlayer.TeamColor.Color}
							/>
						</>
					) : (
						<TextLabel
							anchorPoint={new Vector2(0.5, 0.5)}
							backgroundTransparency={1}
							position={UDim2.fromScale(0.5, 0.5)}
							size={UDim2.fromScale(1, 0.5)}
							text={"No players to spectate"}
						/>
					)}
				</Frame>
				<TextButton
					anchorPoint={new Vector2(0, 0.5)}
					position={UDim2.fromScale(0, 0.5)}
					size={UDim2.fromScale(0.075, 0.5)}
					text="<"
					event={{ Activated: handlePrev }}
				/>
				<TextButton
					anchorPoint={new Vector2(1, 0.5)}
					position={UDim2.fromScale(1, 0.5)}
					size={UDim2.fromScale(0.075, 0.5)}
					text=">"
					event={{ Activated: handleNext }}
				/>
				<uiaspectratioconstraint
					AspectRatio={5}
					AspectType={Enum.AspectType.ScaleWithParentSize}
					DominantAxis={Enum.DominantAxis.Height}
				/>
			</frame>
		</screengui>
	);
};

export default SpectatorHUD;
