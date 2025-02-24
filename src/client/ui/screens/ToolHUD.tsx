import { useFlameworkDependency } from "@rbxts/flamework-react-utils";
import React, { useEffect, useState } from "@rbxts/react";
import { GameCharacterComponent } from "client/components/characters";
import { CharacterController } from "client/controllers";

export const ToolHUD = (): React.Element | undefined => {
	const [visible, setVisible] = useState(false);

	const [tools, setTools] = useState(new Array<string>());
	const [curToolSlot, setCurToolSlot] = useState(0);

	const characterController = useFlameworkDependency<CharacterController>();

	useEffect(() => {
		const connection = characterController.CharacterAdded.Connect((gameCharacter) => {
			if (!(gameCharacter instanceof GameCharacterComponent)) return;

			setVisible(true);
			setTools(gameCharacter.getTools().map((tool) => tool.instance.Name));

			gameCharacter.ToolEquipped.Connect((slot) => {
				setCurToolSlot(slot);
			});

			characterController.CharacterRemoved.Once(() => setVisible(false));
		});

		return () => connection.Disconnect();
	}, []);

	if (!visible) return;

	return (
		<frame
			AnchorPoint={new Vector2(0.5, 1)}
			BackgroundTransparency={1}
			Position={UDim2.fromScale(0.5, 1)}
			Size={UDim2.fromScale(1, 0.08)}
		>
			<frame
				AnchorPoint={new Vector2(0.5, 0.5)}
				BackgroundTransparency={1}
				Position={UDim2.fromScale(0.5, 0.2)}
				Size={UDim2.fromScale(0, 1)}
			>
				{tools.map((toolName, index) => {
					const isEquipped = index === curToolSlot;
					const sizeScale = isEquipped ? 1.2 : 1;
					return (
						<textlabel
							BackgroundColor3={new Color3(0, 0, 0)}
							BackgroundTransparency={0.5}
							Size={UDim2.fromScale(sizeScale, sizeScale)}
							Font={Enum.Font.Arcade}
							Text={toolName}
							TextColor3={new Color3(1, 1, 1)}
							TextScaled={true}
						>
							{isEquipped && (
								<uistroke
									ApplyStrokeMode={Enum.ApplyStrokeMode.Border}
									Color={new BrickColor("Cyan").Color}
									Thickness={2}
								/>
							)}
						</textlabel>
					);
				})}
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
		</frame>
	);
};
