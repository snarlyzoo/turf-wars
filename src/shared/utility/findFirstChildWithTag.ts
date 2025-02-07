export function findFirstChildWithTag(parent: Instance, tag: string): Instance | undefined {
	for (const child of parent.GetChildren()) {
		if (child.HasTag(tag)) {
			return child;
		}
	}
}
