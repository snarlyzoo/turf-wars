import React, { useEffect, useRef } from "@rbxts/react";

interface ProgressBarProps {
	anchorPoint?: Vector2;
	backgroundColor?: Color3;
	backgroundTransparency?: number;
	position?: UDim2;
	size?: UDim2;

	progressColor?: Color3;
	progressTransparency?: number;

	font?: Enum.Font;
	textColor?: Color3;
	textVisible?: boolean;
	textAlignment?: "Left" | "Progress";

	value: number;
	maxValue?: number;
}

export const ProgressBar = (props: ProgressBarProps): React.Element => {
	const progressRef = useRef<Frame>(undefined);
	const textRef = useRef<TextLabel>(undefined);

	const { textVisible = false, textAlignment = "Left", maxValue = 100 } = props;

	const progress = math.clamp(props.value / maxValue, 0, 1);

	useEffect(() => {
		if (!textVisible) return;

		const progressBar = progressRef.current;
		const textLabel = textRef.current;
		if (!progressBar || !textLabel) return;

		const barSize = progressBar.AbsoluteSize;
		const textSize = barSize.Y;

		textLabel.TextSize = textSize;
		textLabel.Size = UDim2.fromOffset(textLabel.TextBounds.X, textSize);

		const minXOffset = textSize * 0.2;
		const xOffset =
			textAlignment === "Progress" ? math.max(minXOffset, barSize.X - textLabel.TextBounds.X) : minXOffset;
		textLabel.Position = new UDim2(0, xOffset, 0.5, 0);
	}, [progress, textVisible, textAlignment]);

	return (
		<frame
			AnchorPoint={props.anchorPoint}
			BackgroundColor3={props.backgroundColor}
			BackgroundTransparency={props.backgroundTransparency}
			BorderSizePixel={0}
			Position={props.position}
			Size={props.size}
		>
			<frame
				ref={progressRef}
				AnchorPoint={new Vector2(0, 0.5)}
				BackgroundColor3={props.progressColor}
				BackgroundTransparency={props.progressTransparency}
				BorderSizePixel={0}
				Position={UDim2.fromScale(0, 0.5)}
				Size={UDim2.fromScale(progress, 1)}
			/>
			{textVisible && (
				<textlabel
					ref={textRef}
					AnchorPoint={new Vector2(0, 0.5)}
					BackgroundTransparency={1}
					Font={props.font}
					Text={`${math.floor(props.value)}`}
					TextColor3={props.textColor}
				/>
			)}
		</frame>
	);
};
