import { useFlameworkDependency } from "@rbxts/flamework-react-utils";
import React, { useEffect, useState } from "@rbxts/react";
import { GameCharacterComponent } from "client/components/characters";
import { CharacterController } from "client/controllers";

const ToolIcon = (props: { name: string; equipped: boolean }): React.Element => {
	const sizeScale = props.equipped ? 1.2 : 1;
	return (
		<textlabel
			BackgroundColor3={new Color3(0, 0, 0)}
			BackgroundTransparency={0.5}
			BorderSizePixel={0}
			Size={UDim2.fromScale(sizeScale, sizeScale)}
			Font={Enum.Font.Arcade}
			Text={props.name}
			TextColor3={new Color3(1, 1, 1)}
			TextScaled={true}
		>
			{props.equipped && (
				<uistroke
					ApplyStrokeMode={Enum.ApplyStrokeMode.Border}
					Color={new BrickColor("Cyan").Color}
					Thickness={2}
				/>
			)}
		</textlabel>
	);
};

const ResourceCount = (props: { count: number }): React.Element => {
	return (
		<frame
			BackgroundColor3={new Color3(0, 0, 0)}
			BackgroundTransparency={0.5}
			BorderSizePixel={0}
			Size={UDim2.fromScale(1, 1)}
		>
			<textlabel
				AnchorPoint={new Vector2(1, 0.5)}
				BackgroundTransparency={1}
				Position={UDim2.fromScale(0.9, 0.5)}
				Size={UDim2.fromScale(0.5, 0.8)}
				Font={Enum.Font.Arcade}
				RichText={true}
				Text={`x<b>${props.count}</b>`}
				TextColor3={new Color3(1, 1, 1)}
				TextScaled={true}
				TextXAlignment={Enum.TextXAlignment.Left}
			/>
		</frame>
	);
};

export const ToolHUD = (): React.Element | undefined => {
	const [visible, setVisible] = useState(false);

	const [toolNames, setToolNames] = useState(new Array<string>());
	const [curToolSlot, setCurToolSlot] = useState(0);

	const [blockCount, setBlockCount] = useState(0);
	const [projectileCount, setProjectileCount] = useState(0);

	const characterController = useFlameworkDependency<CharacterController>();

	useEffect(() => {
		const connections = new Array<RBXScriptConnection>();

		connections.push(
			characterController.CharacterAdded.Connect((gameCharacter) => {
				if (!(gameCharacter instanceof GameCharacterComponent)) return;

				setVisible(true);
				characterController.CharacterRemoved.Once(() => setVisible(false));

				setToolNames(gameCharacter.tools.map((tool) => tool.instance.Name));
				gameCharacter.ToolEquipped.Connect((slot) => setCurToolSlot(slot));
			}),
		);

		connections.push(characterController.BlockCountChanged.Connect((count) => setBlockCount(count)));
		connections.push(characterController.ProjectileCountChanged.Connect((count) => setProjectileCount(count)));

		return () => connections.forEach((connection) => connection.Disconnect());
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

			<frame
				AnchorPoint={new Vector2(1, 1)}
				BackgroundTransparency={1}
				Position={UDim2.fromScale(1, 1)}
				Size={UDim2.fromScale(0, 1)}
			>
				<ResourceCount count={projectileCount} />
				<ResourceCount count={blockCount} />
				<uiaspectratioconstraint
					AspectRatio={2.5}
					AspectType={Enum.AspectType.ScaleWithParentSize}
					DominantAxis={Enum.DominantAxis.Height}
				/>
				<uilistlayout
					Padding={new UDim(0.1, 0)}
					FillDirection={Enum.FillDirection.Horizontal}
					HorizontalAlignment={Enum.HorizontalAlignment.Right}
				/>
			</frame>
		</frame>
	);
};
