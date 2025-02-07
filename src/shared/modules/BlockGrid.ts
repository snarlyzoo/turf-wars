import { ReplicatedStorage, RunService, Workspace } from "@rbxts/services";

export abstract class BlockGrid {
	public static readonly BLOCK_SIZE = 3;
	public static readonly DIMENSIONS = new Vector3(80, 30, 60);

	public static readonly MIN_BOUNDS = new Vector3(-this.DIMENSIONS.X / 2, 0, -this.DIMENSIONS.Z / 2).mul(
		this.BLOCK_SIZE,
	);
	public static readonly MAX_BOUNDS = new Vector3(
		this.DIMENSIONS.X / 2,
		this.DIMENSIONS.Y,
		this.DIMENSIONS.Z / 2,
	).mul(this.BLOCK_SIZE);

	public static readonly Folder = ((): Folder => {
		if (RunService.IsServer()) {
			const folder = new Instance("Folder");
			folder.Name = "BLOCK_GRID";
			folder.Parent = Workspace;
			return folder;
		} else {
			return Workspace.WaitForChild("BLOCK_GRID") as Folder;
		}
	})();

	private static readonly blockPrefab = ReplicatedStorage.FindFirstChild("Block") as BasePart;

	public static placeBlock(position: Vector3, teamColor: BrickColor): BasePart {
		const block = this.blockPrefab.Clone();
		block.Position = position;
		block.SetAttribute("TeamColor", teamColor);
		block.Parent = BlockGrid.Folder;
		return block;
	}

	public static snapNormal(normal: Vector3): Vector3 {
		const [x, y, z] = [math.abs(normal.X), math.abs(normal.Y), math.abs(normal.Z)];
		return x > y && x > z
			? new Vector3(math.sign(normal.X), 0, 0)
			: y > z
			? new Vector3(0, math.sign(normal.Y), 0)
			: new Vector3(0, 0, math.sign(normal.Z));
	}

	public static snapPosition(position: Vector3): Vector3 {
		return new Vector3(this.snapAxis(position.X), this.snapAxis(position.Y), this.snapAxis(position.Z));
	}

	public static isPositionInBounds(position: Vector3): boolean {
		const { X, Y, Z } = position;
		const { X: minX, Y: minY, Z: minZ } = this.MIN_BOUNDS;
		const { X: maxX, Y: maxY, Z: maxZ } = this.MAX_BOUNDS;

		return X >= minX && X <= maxX && Y >= minY && Y <= maxY && Z >= minZ && Z <= maxZ;
	}

	public static clear(): void {
		this.Folder.ClearAllChildren();
	}

	private static snapAxis(value: number): number {
		return math.floor(value / this.BLOCK_SIZE) * this.BLOCK_SIZE + this.BLOCK_SIZE / 2;
	}
}
