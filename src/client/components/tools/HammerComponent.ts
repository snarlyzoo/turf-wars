import { Component } from "@flamework/components";
import { OnRender } from "@flamework/core";
import { ReplicatedStorage, Workspace } from "@rbxts/services";
import { GameCharacterComponent } from "client/components/characters";
import { ViewmodelComponent } from "client/components/characters/addons";
import { Events, Functions } from "client/network";
import { BlockComponent } from "shared/components";
import { BlockGrid } from "shared/modules";
import { HammerConfig } from "shared/types/toolTypes";
import { getHammerConfig } from "shared/utility";
import { ToolComponent } from "./ToolComponent";

type TargetIndicator = PVInstance & { SelectionBox: SelectionBox };

@Component()
export class HammerComponent extends ToolComponent implements OnRender {
	private readonly BLOCK_OVERLAP_SIZE: Vector3 = new Vector3(1, 1, 1).mul(BlockGrid.BLOCK_SIZE * 0.9);

	private readonly Map: Model = Workspace.FindFirstChild("Map") as Model;

	private toDelete: boolean = false;

	private placePos?: Vector3;
	private targetBlock?: BlockComponent;

	private targetIndicator!: TargetIndicator;

	private config!: HammerConfig;

	public override initialize(character: GameCharacterComponent, viewmodel: ViewmodelComponent): void {
		super.initialize(character, viewmodel);

		this.targetIndicator = ReplicatedStorage.FindFirstChild("TargetIndicator")?.Clone() as TargetIndicator;
		this.targetIndicator.Parent = this.gameCharacter.camera;

		this.config = getHammerConfig(this.instance.FindFirstChildOfClass("Configuration"));
	}

	public onRender(): void {
		if (!this.equipped) return;

		const camCFrame = this.gameCharacter.camera.CFrame;

		const raycastParams = new RaycastParams();
		raycastParams.FilterDescendantsInstances = [BlockGrid.Folder, this.Map];
		raycastParams.FilterType = Enum.RaycastFilterType.Include;

		const raycastResult = Workspace.Raycast(
			camCFrame.Position,
			camCFrame.LookVector.mul(this.config.range),
			raycastParams,
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
			if (this.targetBlock && this.targetBlock.attributes.TeamColor === this.gameCharacter.player.TeamColor) {
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
		if (!this.equipped || this.isActive) return;

		if (!this.placePos || !BlockGrid.isPositionInBounds(this.placePos)) return;

		if (Workspace.GetPartBoundsInBox(new CFrame(this.placePos), this.BLOCK_OVERLAP_SIZE).size() > 0) return;

		const block = BlockGrid.placeBlock(this.placePos, this.gameCharacter.player.TeamColor);
		Functions.PlaceBlock.invoke(this.placePos).then(() => block.Destroy());
	}
}
