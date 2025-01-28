import { CollectionService } from "@rbxts/services";

export function findFirstChildWithTag(parent: Instance, tag: string): Instance | undefined {
	CollectionService.GetTagged(tag).forEach((instance) => {
		if (instance.Parent === parent) return instance;
	});
	return undefined;
}
