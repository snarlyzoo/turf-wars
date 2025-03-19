import React, { useEffect, useRef } from "@rbxts/react";
import { Frame, TextLabel } from "client/ui/elements/base";

interface ResourceCountProps {
	count: number;

	resourcePrefab: PVInstance;
	teamColor?: BrickColor;
	viewportOffset?: Vector3;
}

const ResourceCount = (props: ResourceCountProps): React.Element => {
	const viewportRef = useRef<ViewportFrame>();

	useEffect(() => {
		const viewport = viewportRef.current;
		if (viewport) {
			const resource = props.resourcePrefab.Clone();
			for (const tag of resource.GetTags()) resource.RemoveTag(tag);
			if (props.teamColor && resource.IsA("BasePart")) resource.BrickColor = props.teamColor;
			resource.Parent = viewport;

			const camera = new Instance("Camera");
			camera.CFrame = CFrame.lookAt(props.viewportOffset ?? new Vector3(0, 0, -1), Vector3.zero);
			viewport.CurrentCamera = camera;

			return () => {
				resource.Destroy();
				camera.Destroy();
			};
		}
	}, []);

	return (
		<Frame size={UDim2.fromScale(1, 1)}>
			<viewportframe
				ref={viewportRef}
				AnchorPoint={new Vector2(0, 0.5)}
				BackgroundTransparency={1}
				Position={UDim2.fromScale(0, 0.5)}
				Size={UDim2.fromScale(0.4, 0.8)}
			/>
			<TextLabel
				anchorPoint={new Vector2(1, 0.5)}
				backgroundTransparency={1}
				position={UDim2.fromScale(0.9, 0.5)}
				size={UDim2.fromScale(0.5, 0.8)}
				richText={true}
				text={`x<b>${props.count}</b>`}
				textXAlignment={Enum.TextXAlignment.Left}
			/>
		</Frame>
	);
};

export default ResourceCount;
