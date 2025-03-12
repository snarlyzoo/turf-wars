import React from "@rbxts/react";

interface ChampionTitleProps {
	adornee: PVInstance;
	alignment: "Top" | "Bottom";

	username: string;
	award: string;
	message: string;
}

const ChampionTitle = (props: ChampionTitleProps): React.Element => {
	return (
		<billboardgui
			Adornee={props.adornee}
			AlwaysOnTop={true}
			Size={UDim2.fromScale(7, 1.5)}
			StudsOffsetWorldSpace={new Vector3(0, props.alignment === "Top" ? 7 : -1, 0)}
		>
			<frame
				AnchorPoint={new Vector2(0.5, 0.5)}
				BackgroundColor3={new Color3(0, 0, 0)}
				BackgroundTransparency={0.5}
				BorderSizePixel={0}
				Position={UDim2.fromScale(0.5, 0.5)}
				Size={UDim2.fromScale(1, 1)}
			>
				<textlabel
					AnchorPoint={new Vector2(0.5, 0)}
					BackgroundTransparency={1}
					Position={UDim2.fromScale(0.5, 0)}
					Size={UDim2.fromScale(1, 0.5)}
					Font={Enum.Font.Arcade}
					RichText={true}
					Text={`<b>${props.username}</b>`}
					TextColor3={new Color3(1, 1, 1)}
					TextScaled={true}
				/>
				<textlabel
					AnchorPoint={new Vector2(0.5, 0)}
					BackgroundTransparency={1}
					Position={UDim2.fromScale(0.5, 0.5)}
					Size={UDim2.fromScale(1, 0.3)}
					Font={Enum.Font.Arcade}
					RichText={true}
					Text={`<b>The ${props.award}</b>`}
					TextColor3={new Color3(1, 1, 1)}
					TextScaled={true}
				/>
				<textlabel
					AnchorPoint={new Vector2(0.5, 1)}
					BackgroundTransparency={1}
					Position={UDim2.fromScale(0.5, 1)}
					Size={UDim2.fromScale(1, 0.2)}
					Font={Enum.Font.Arcade}
					Text={props.message}
					TextColor3={new Color3(1, 1, 1)}
					TextScaled={true}
				/>
			</frame>
		</billboardgui>
	);
};

export default ChampionTitle;
