import { CollectionService } from "@rbxts/services";

export function findFirstChildWithTag(parent: Instance, tag: string): Instance | undefined {
	for (const instance of CollectionService.GetTagged(tag)) {
		if (instance.Parent === parent) {
			return instance;
		}
	}
}
