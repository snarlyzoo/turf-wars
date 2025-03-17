import React, { useEffect, useRef } from "@rbxts/react";

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
		<frame
			BackgroundColor3={new Color3(0, 0, 0)}
			BackgroundTransparency={0.5}
			BorderSizePixel={0}
			Size={UDim2.fromScale(1, 1)}
		>
			<viewportframe
				ref={viewportRef}
				AnchorPoint={new Vector2(0, 0.5)}
				BackgroundTransparency={1}
				Position={UDim2.fromScale(0, 0.5)}
				Size={UDim2.fromScale(0.4, 0.8)}
			/>
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
