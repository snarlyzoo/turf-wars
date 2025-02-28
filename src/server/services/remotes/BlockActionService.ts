import { Components } from "@flamework/components";
import { Service } from "@flamework/core";
import { Workspace } from "@rbxts/services";
import { GamePlayerComponent } from "server/components/players";
import { ORIGIN_ERROR_TOLERANCE, PING_ERROR_TOLERANCE } from "server/network";
import { TurfService } from "server/services";
import { PlayerRegistry, PlayerStatsManager } from "server/services/players";
import { BlockComponent } from "shared/components";
import { BlockGrid } from "shared/modules";
import { HumanoidCharacterInstance } from "shared/types/characterTypes";
import { HammerConfig, ToolType } from "shared/types/toolTypes";

type HammerContext = [HumanoidCharacterInstance, HammerConfig];

@Service()
export class BlockActionService {
	private readonly BLOCK_OVERLAP_SIZE: Vector3 = new Vector3(1, 1, 1).mul(BlockGrid.BLOCK_SIZE * 0.9);

	public constructor(
		private components: Components,
		private playerRegistry: PlayerRegistry,
		private playerStatsManager: PlayerStatsManager,
		private turfService: TurfService,
	) {}

	public handleDamageBlock(gamePlayer: GamePlayerComponent, block: BasePart): void {
		const hammerContext = this.validateHammerContext(gamePlayer);
		if (!hammerContext) return;

		const [character, config] = hammerContext;

		const component = this.components.getComponent<BlockComponent>(block);
		if (!component) {
			warn(`${gamePlayer.instance.Name} passed a block with no block component`);
			return;
		}

		if (component.attributes.TeamColor !== gamePlayer.team.TeamColor) {
			warn(`${gamePlayer.instance.Name} tried to damage a block that is not their team color`);
			this.playerRegistry.kickPlayer(gamePlayer.instance, "damaging a block that is not their team color");
			return;
		}

		const tick = os.clock();
		if (tick - gamePlayer.lastDamageBlockTick < 60 / config.rateOfDamage - PING_ERROR_TOLERANCE) {
			warn(`${gamePlayer.instance.Name} tried to damage a block too quickly`);
			this.playerRegistry.addKickOffense(gamePlayer.instance, "damaging a block too quickly");
			return;
		}

		if (!this.validateActionRange(character, block.Position, config.range)) {
			warn(`${gamePlayer.instance.Name} tried to damage a block that is too far away`);
			return;
		}

		if (component.takeDamage(config.damage)) {
			gamePlayer.giveBlocks(1);
			this.playerStatsManager.incrementStat(gamePlayer.instance, "blocksDestroyed");
		}
		gamePlayer.lastDamageBlockTick = tick;
	}

	public handlePlaceBlock(gamePlayer: GamePlayerComponent, position: Vector3): boolean {
		if (gamePlayer.blockCount <= 0) {
			warn(`${gamePlayer.instance.Name} does not have enough blocks`);
			return false;
		}

		const hammerContext = this.validateHammerContext(gamePlayer);
		if (!hammerContext) return false;

		const [character, config] = hammerContext;

		if (
			position !== BlockGrid.snapPosition(position) ||
			!this.turfService.isPositionOnTurf(position, gamePlayer.team)
		) {
			warn(`${gamePlayer.instance.Name} tried to place a block at an invalid position`);
			return false;
		}

		if (!this.validateActionRange(character, position, config.range)) {
			warn(`${gamePlayer.instance.Name} tried to place a block that is too far away`);
			return false;
		}

		const overlapParams = new OverlapParams();
		overlapParams.FilterDescendantsInstances = [character];
		overlapParams.FilterType = Enum.RaycastFilterType.Exclude;

		if (Workspace.GetPartBoundsInBox(new CFrame(position), this.BLOCK_OVERLAP_SIZE, overlapParams).size() > 0) {
			warn(`${gamePlayer.instance.Name} tried to place a block in an occupied space`);
			return false;
		}

		this.turfService.registerBlock(
			BlockGrid.placeBlock(position, gamePlayer.team.TeamColor, gamePlayer.blockPrefab),
		);

		gamePlayer.blockCount--;
		this.playerStatsManager.incrementStat(gamePlayer.instance, "blocksPlaced");

		return true;
	}

	private validateHammerContext(gamePlayer: GamePlayerComponent): HammerContext | undefined {
		if (!gamePlayer.isAlive) {
			warn(`${gamePlayer.instance.Name} is not alive`);
			return;
		}

		const character = gamePlayer.getCharacter();
		if (!character) {
			warn(`${gamePlayer.instance.Name} does not have a character`);
			return;
		}

		const tool = gamePlayer.getCurrentTool();
		if (!tool || !tool.HasTag("Hammer")) {
			warn(`${gamePlayer.instance.Name} does not have a hammer equipped`);
			return;
		}

		const config = gamePlayer.getToolConfig(ToolType.Hammer);
		if (!config) {
			warn(`${gamePlayer.instance.Name} does not have a hammer config`);
			return;
		}

		return [character, config];
	}

	private validateActionRange(character: HumanoidCharacterInstance, position: Vector3, range: number): boolean {
		const charPos = character.GetPivot().Position.add(new Vector3(0, 1.5, 0));
		return charPos.sub(position).Magnitude <= range + BlockGrid.BLOCK_SIZE / 2 + ORIGIN_ERROR_TOLERANCE;
	}
}
