import React, { useEffect, useRef } from "@rbxts/react";

interface ProgressBarProps {
	anchorPoint?: Vector2;
	backgroundColor?: Color3;
	borderSizePixel?: number;
	position?: UDim2;
	size?: UDim2;

	progressColor?: Color3;

	font?: Enum.Font;
	textColor?: Color3;

	value: number;
	maxValue?: number;
}

const ProgressBar = (props: ProgressBarProps): React.Element => {
	const progressRef = useRef<Frame>(undefined);
	const textRef = useRef<TextLabel>(undefined);

	const progress = math.clamp(props.value / (props.maxValue ?? 100), 0, 1);

	useEffect(() => {
		const progressBar = progressRef.current;
		const textLabel = textRef.current;
		if (!progressBar || !textLabel) return;

		const barSize = progressBar.AbsoluteSize;

		textLabel.TextSize = barSize.Y;
		textLabel.Size = UDim2.fromOffset(textLabel.TextBounds.X, barSize.Y);
		textLabel.Position = new UDim2(0, math.max(barSize.Y * 0.2, barSize.X - textLabel.TextBounds.X), 0.5, 0);
	}, [progress]);

	return (
		<frame
			AnchorPoint={props.anchorPoint}
			BackgroundColor3={props.backgroundColor}
			BorderSizePixel={props.borderSizePixel}
			Position={props.position}
			Size={props.size}
		>
			<frame
				ref={progressRef}
				AnchorPoint={new Vector2(0, 0.5)}
				BackgroundColor3={props.progressColor}
				BorderSizePixel={0}
				Position={UDim2.fromScale(0, 0.5)}
				Size={UDim2.fromScale(progress, 1)}
			/>
			<textlabel
				ref={textRef}
				AnchorPoint={new Vector2(0, 0.5)}
				BackgroundTransparency={1}
				Font={props.font}
				Text={`${math.floor(props.value)}`}
				TextColor3={props.textColor}
			/>
		</frame>
	);
};

export default ProgressBar;
