import React from "@rbxts/react";
import { TextLabel } from "client/ui/elements/base";

interface ToolIconProps {
	name: string;
	equipped: boolean;
}

const ToolIcon = (props: ToolIconProps): React.Element => {
	const sizeScale = props.equipped ? 1.2 : 1;
	return (
		<TextLabel size={UDim2.fromScale(sizeScale, sizeScale)} text={props.name}>
			{props.equipped && (
				<uistroke
					ApplyStrokeMode={Enum.ApplyStrokeMode.Border}
					Color={new BrickColor("Cyan").Color}
					Thickness={2}
				/>
			)}
		</TextLabel>
	);
};

export default ToolIcon;
