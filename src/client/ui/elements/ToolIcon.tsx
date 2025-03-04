import React from "@rbxts/react";

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

export default ToolIcon;
