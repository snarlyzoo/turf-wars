import { Component, Components } from "@flamework/components";
import { OnRender } from "@flamework/core";
import { Workspace } from "@rbxts/services";
import { CharacterController } from "client/controllers";
import { Events, Functions } from "client/network";
import { BlockComponent } from "shared/components";
import { BlockGrid } from "shared/modules";
import { HammerConfig, ResourceType, TargetIndicator, ToolType } from "shared/types/toolTypes";
import { getHammerConfig } from "shared/utility";
import { ToolComponent } from "./ToolComponent";
import { roundStateAtom } from "shared/state/RoundState";

@Component()
export class HammerComponent extends ToolComponent implements OnRender {
	private readonly BLOCK_OVERLAP_SIZE: Vector3 = new Vector3(1, 1, 1).mul(BlockGrid.BLOCK_SIZE * 0.9);

	public override toolType = ToolType.Hammer;
	public override resourceType = ResourceType.Block;

	public override hasSecondaryAction = true;

	private toDelete: boolean = false;

	private placePos?: Vector3;
	private targetBlock?: BlockComponent;

	private targetIndicator!: TargetIndicator;

	private config!: HammerConfig;

	private raycastParams: RaycastParams = new RaycastParams();

	public constructor(protected characterController: CharacterController, protected components: Components) {
		super(characterController, components);
	}

	public override async onStart(): Promise<void> {
		await super.onStart();

		this.config = getHammerConfig(this.instance.FindFirstChildOfClass("Configuration"));

		this.targetIndicator = this.characterController.targetIndicator.Clone();
		this.targetIndicator.Parent = this.characterController.camera;

		const filter: Array<Instance> = [BlockGrid.Folder];
		const gameMap = roundStateAtom()?.gameMap;
		if (gameMap) {
			filter.push(gameMap);
		} else {
			warn("No game map found");
		}
		this.raycastParams.FilterDescendantsInstances = filter;
		this.raycastParams.FilterType = Enum.RaycastFilterType.Include;
	}

	public onRender(): void {
		if (!this.equipped) return;

		const camCFrame = this.characterController.camera.CFrame;

		const raycastResult = Workspace.Raycast(
			camCFrame.Position,
			camCFrame.LookVector.mul(this.config.range),
			this.raycastParams,
		);
		if (!raycastResult) {
			this.placePos = undefined;
			this.targetBlock = undefined;
			this.targetIndicator.SelectionBox.Visible = false;
			return;
		}

		const target = raycastResult.Instance;
		if (target.IsA("BasePart") && target.HasTag("Block")) {
			const block = this.components.getComponent<BlockComponent>(target);
			if (block) this.targetBlock = block;
		} else {
			this.targetBlock = undefined;
		}

		const normal = BlockGrid.snapNormal(raycastResult.Normal);
		this.placePos = BlockGrid.snapPosition(raycastResult.Position.add(normal));

		this.targetIndicator.PivotTo(new CFrame(this.placePos.sub(normal.mul(BlockGrid.BLOCK_SIZE))));
		this.targetIndicator.SelectionBox.Visible = true;
	}

	public override unequip(): void {
		super.unequip();
		this.targetIndicator.SelectionBox.Visible = false;
	}

	public override usePrimaryAction(toActivate: boolean): void {
		this.damageBlock(toActivate);
	}

	public override useSecondaryAction(): void {
		this.placeBlock();
	}

	private damageBlock(toDamage: boolean): void {
		this.toDelete = toDamage;
		if (!this.equipped || this.isActive || !this.toDelete) return;

		this.isActive = true;

		while (this.equipped && this.toDelete) {
			if (this.targetBlock && this.targetBlock.attributes.TeamColor === this.characterController.team.TeamColor) {
				this.targetBlock.takeDamage(this.config.damage);
				Events.DamageBlock.fire(this.targetBlock.instance);

				task.wait(60 / this.config.rateOfDamage);
			} else {
				task.wait();
			}
		}

		this.isActive = false;
	}

	private placeBlock(): void {
		if (!this.equipped || this.isActive || this.characterController.blockCount <= 0) return;

		if (!this.placePos || !BlockGrid.isPositionOnTurf(this.placePos, this.characterController.team)) return;

		if (Workspace.GetPartBoundsInBox(new CFrame(this.placePos), this.BLOCK_OVERLAP_SIZE).size() > 0) return;

		const block = BlockGrid.placeBlock(
			this.placePos,
			this.characterController.team.TeamColor,
			this.characterController.blockPrefab,
		);
		Functions.PlaceBlock.invoke(this.placePos).then((success) => {
			if (success) this.characterController.blockCount--;
			block.Destroy();
		});
	}
}
