import React from "@rbxts/react";

interface FrameProps {
	anchorPoint?: Vector2;
	position?: UDim2;
	size?: UDim2;

	children?: React.ReactNode;
}

const Frame = (props: FrameProps): React.Element => {
	return (
		<frame
			AnchorPoint={props.anchorPoint}
			BackgroundColor3={new Color3(0, 0, 0)}
			BackgroundTransparency={0.5}
			BorderSizePixel={0}
			Position={props.position}
			Size={props.size}
		>
			{props.children}
		</frame>
	);
};

export default Frame;
