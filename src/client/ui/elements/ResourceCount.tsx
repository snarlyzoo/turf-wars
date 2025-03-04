import React from "@rbxts/react";

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

export default ResourceCount;
