import { useFlameworkDependency } from "@rbxts/flamework-react-utils";
import React, { useEffect, useState } from "@rbxts/react";
import { GameCharacterComponent } from "client/components/characters";
import { CharacterController } from "client/controllers";
import { ToolIcon } from "client/ui/elements/round";

const ToolDisplay = (): React.Element => {
	const [toolNames, setToolNames] = useState(new Array<string>());
	const [curToolSlot, setCurToolSlot] = useState(0);

	const characterController = useFlameworkDependency<CharacterController>();

	useEffect(() => {
		function onGameCharacterAdded(gameCharacter: GameCharacterComponent): void {
			setToolNames(gameCharacter.tools.map((tool) => tool.instance.Name));
			gameCharacter.ToolEquipped.Connect((slot) => setCurToolSlot(slot));
		}
		const gameCharacter = characterController.getCharacterComponent(GameCharacterComponent);
		if (gameCharacter) onGameCharacterAdded(gameCharacter);

		const connection = characterController.CharacterAdded.Connect((gameCharacter) => {
			if (gameCharacter instanceof GameCharacterComponent) onGameCharacterAdded(gameCharacter);
		});
		return () => connection.Disconnect();
	}, []);

	return (
		<frame
			AnchorPoint={new Vector2(0.5, 1)}
			BackgroundTransparency={1}
			Position={UDim2.fromScale(0.5, 0.7)}
			Size={UDim2.fromScale(0, 1)}
		>
			{toolNames.map((toolName, index) => (
				<ToolIcon name={toolName} equipped={index === curToolSlot} />
			))}
			<uiaspectratioconstraint
				AspectRatio={1}
				AspectType={Enum.AspectType.ScaleWithParentSize}
				DominantAxis={Enum.DominantAxis.Height}
			/>
			<uilistlayout
				Padding={new UDim(0.15, 0)}
				FillDirection={Enum.FillDirection.Horizontal}
				HorizontalAlignment={Enum.HorizontalAlignment.Center}
				VerticalAlignment={Enum.VerticalAlignment.Center}
			/>
		</frame>
	);
};

export default ToolDisplay;
