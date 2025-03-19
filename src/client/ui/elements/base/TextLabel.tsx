import React from "@rbxts/react";

interface TextLabelProps {
	anchorPoint?: Vector2;
	backgroundTransparency?: number;
	position?: UDim2;
	size?: UDim2;

	richText?: boolean;
	text: string;
	textXAlignment?: Enum.TextXAlignment;

	children?: React.ReactNode;
}

const TextLabel = (props: TextLabelProps): React.Element => {
	return (
		<textlabel
			AnchorPoint={props.anchorPoint}
			BackgroundColor3={new Color3(0, 0, 0)}
			BackgroundTransparency={props.backgroundTransparency ?? 0.5}
			BorderSizePixel={0}
			Position={props.position}
			Size={props.size}
			Font={Enum.Font.Arcade}
			RichText={props.richText}
			Text={props.text}
			TextColor3={new Color3(1, 1, 1)}
			TextScaled={true}
			TextXAlignment={props.textXAlignment}
		>
			{props.children}
		</textlabel>
	);
};

export default TextLabel;
