import React from "@rbxts/react";
import { Frame, TextLabel } from "client/ui/elements/base";

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
			<Frame size={UDim2.fromScale(1, 1)}>
				<TextLabel
					anchorPoint={new Vector2(0.5, 0)}
					backgroundTransparency={1}
					position={UDim2.fromScale(0.5, 0)}
					size={UDim2.fromScale(1, 0.5)}
					richText={true}
					text={`<b>${props.username}</b>`}
				/>
				<TextLabel
					anchorPoint={new Vector2(0.5, 0)}
					backgroundTransparency={1}
					position={UDim2.fromScale(0.5, 0.5)}
					size={UDim2.fromScale(1, 0.3)}
					richText={true}
					text={`<b>The ${props.award}</b>`}
				/>
				<TextLabel
					anchorPoint={new Vector2(0.5, 1)}
					backgroundTransparency={1}
					position={UDim2.fromScale(0.5, 1)}
					size={UDim2.fromScale(1, 0.2)}
					text={props.message}
				/>
			</Frame>
		</billboardgui>
	);
};

export default ChampionTitle;
