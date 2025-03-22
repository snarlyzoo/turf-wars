import { OnStart, Service } from "@flamework/core";
import { AbstractConstructor } from "@flamework/core/out/utility";
import { PlayerComponent, GamePlayerComponent } from "server/components/players";
import { Events, Functions } from "server/network";
import { PlayerRegistry } from "server/services/players";
import { BlockActionService, ProjectileActionService } from ".";
import { ToolType } from "shared/types/toolTypes";
import { ProjectileHitType } from "shared/types/projectileTypes";

enum RemoteName {
	UpdateCharacterTilt = "UpdateCharacterTilt",
	EquipTool = "EquipTool",
	FireProjectile = "FireProjectile",
	RegisterProjectileHit = "RegisterProjectileHit",
	DamageBlock = "DamageBlock",
	PlaceBlock = "PlaceBlock",
}

@Service()
class RemoteHandler implements OnStart {
	public constructor(
		private playerRegistry: PlayerRegistry,
		private blockActionService: BlockActionService,
		private projectileActionService: ProjectileActionService,
	) {}

	public onStart(): void {
		Events.UpdateCharacterTilt.connect((player, angle) => this.handleUpdateCharacterTilt(player, angle));

		Events.EquipTool.connect((player, toolType) => this.handleEquipTool(player, toolType));

		Events.FireProjectile.connect((player, origin, direction, speed, timestamp) =>
			this.handleFireProjectile(player, origin, direction, speed, timestamp),
		);
		Events.RegisterProjectileHit.connect((player, hitType, hitPart, hitTimestamp, fireTimestamp) =>
			this.handleRegisterProjectileHit(player, hitType, hitPart, hitTimestamp, fireTimestamp),
		);

		Events.DamageBlock.connect((player, block) => this.handleDamageBlock(player, block));
		Functions.PlaceBlock.setCallback((player, position) => this.handlePlaceBlock(player, position));
	}

	private usePlayerComponent<T extends PlayerComponent, U = void>(
		player: Player,
		remoteName: RemoteName,
		componentClass: AbstractConstructor<T>,
		callback: (playerComponent: T) => U,
	): U | undefined {
		const playerComponent = this.playerRegistry.getPlayerComponent(player, componentClass);
		if (!playerComponent) {
			warn(`${player.Name} fired ${remoteName} without a ${componentClass}`);
			return;
		}
		return callback(playerComponent);
	}

	private handleUpdateCharacterTilt(player: Player, angle?: number): void {
		this.usePlayerComponent(player, RemoteName.UpdateCharacterTilt, PlayerComponent, (playerComponent) =>
			playerComponent.updateTilt(angle),
		);
	}

	private handleEquipTool(player: Player, toolType: ToolType): void {
		this.usePlayerComponent(player, RemoteName.EquipTool, GamePlayerComponent, (gamePlayer) =>
			gamePlayer.equipTool(toolType),
		);
	}

	private handleFireProjectile(
		player: Player,
		origin: Vector3,
		direction: Vector3,
		speed: number,
		timestamp: number,
	): void {
		this.usePlayerComponent(player, RemoteName.FireProjectile, GamePlayerComponent, (gamePlayer) =>
			this.projectileActionService.handleFireProjectile(gamePlayer, origin, direction, speed, timestamp),
		);
	}

	private handleRegisterProjectileHit(
		player: Player,
		hitType: ProjectileHitType,
		hitPart: BasePart,
		hitTimestamp: number,
		fireTimestamp: number,
	): void {
		this.usePlayerComponent(player, RemoteName.RegisterProjectileHit, GamePlayerComponent, (gamePlayer) =>
			this.projectileActionService.handleRegisterProjectileHit(
				gamePlayer,
				hitType,
				hitPart,
				hitTimestamp,
				fireTimestamp,
			),
		);
	}

	private handleDamageBlock(player: Player, block: BasePart): void {
		this.usePlayerComponent(player, RemoteName.DamageBlock, GamePlayerComponent, (gamePlayer) =>
			this.blockActionService.handleDamageBlock(gamePlayer, block),
		);
	}

	private handlePlaceBlock(player: Player, position: Vector3): boolean {
		return (
			this.usePlayerComponent(player, RemoteName.PlaceBlock, GamePlayerComponent, (gamePlayer) =>
				this.blockActionService.handlePlaceBlock(gamePlayer, position),
			) ?? false
		);
	}
}
