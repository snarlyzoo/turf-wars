import React from "@rbxts/react";

interface TextButtonProps {
	anchorPoint?: Vector2;
	backgroundTransparency?: number;
	position?: UDim2;
	size?: UDim2;

	richText?: boolean;
	text: string;
	textXAlignment?: Enum.TextXAlignment;

	event: React.InstanceEvent<TextButton>;

	children?: React.ReactNode;
}

const TextButton = (props: TextButtonProps): React.Element => {
	return (
		<textbutton
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
			Event={props.event}
		>
			{props.children}
		</textbutton>
	);
};

export default TextButton;
