import { Components } from "@flamework/components";
import { Service } from "@flamework/core";
import { Players, Workspace } from "@rbxts/services";
import { GamePlayerComponent } from "server/components/players";
import { Events, ORIGIN_ERROR_TOLERANCE, PING_ERROR_TOLERANCE } from "server/network";
import { TurfService } from "server/services";
import { PlayerRegistry, PlayerStatsManager } from "server/services/players";
import { BlockComponent } from "shared/components";
import { Physics } from "shared/modules";
import { ProjectileHitType, ProjectileRecord } from "shared/types/projectileTypes";
import { ToolType } from "shared/types/toolTypes";

@Service()
export class ProjectileActionService {
	private readonly PROJECTILE_REFILL_TIME: number = 5;

	private readonly Blocks = Workspace.FindFirstChild("Blocks") as Folder;

	public constructor(
		private components: Components,
		private playerRegistry: PlayerRegistry,
		private playerStatsManager: PlayerStatsManager,
		private turfService: TurfService,
	) {}

	public handleFireProjectile(
		gamePlayer: GamePlayerComponent,
		origin: Vector3,
		direction: Vector3,
		speed: number,
		timestamp: number,
	): void {
		if (!gamePlayer.combatEnabled) {
			warn(`${gamePlayer.instance.Name} does not have combat enabled`);
			return;
		}

		if (!gamePlayer.isAlive) {
			warn(`${gamePlayer.instance.Name} is not alive`);
			return;
		}

		if (gamePlayer.projectileCount <= 0) {
			warn(`${gamePlayer.instance.Name} does not have any projectiles`);
			return;
		}

		const character = gamePlayer.getCharacter();
		if (!character) {
			warn(`${gamePlayer.instance.Name} does not have a character`);
			return;
		}

		const tool = gamePlayer.getCurrentTool();
		if (!tool || !tool.HasTag("Slingshot")) {
			warn(`${gamePlayer.instance.Name} does not have a slingshot equipped`);
			return;
		}

		const config = gamePlayer.getToolConfig(ToolType.Slingshot);
		if (!config) {
			warn(`${gamePlayer.instance.Name} does not have a slingshot config`);
			return;
		}

		const charPos = character.GetPivot().Position.add(new Vector3(0, 1.5, 0));
		if (charPos.sub(origin).Magnitude > ORIGIN_ERROR_TOLERANCE) {
			warn(`${gamePlayer.instance.Name} fired a projectile with an invalid origin`);
			return;
		}

		if (direction === Vector3.zero) {
			this.playerRegistry.kickPlayer(gamePlayer.instance, "firing a projectile with an invalid direction");
			return;
		}
		direction = direction.Unit;

		if (speed <= 0 || speed > config.projectile.maxSpeed) {
			this.playerRegistry.kickPlayer(gamePlayer.instance, "firing a projectile with an invalid speed");
			return;
		}

		const tick = os.clock();
		if (tick - gamePlayer.lastFireProjectileTick < 60 / config.rateOfFire - PING_ERROR_TOLERANCE) {
			this.playerRegistry.addKickOffense(gamePlayer.instance, "firing a projectile too quickly");
			return;
		}

		const projectileRecord: ProjectileRecord = {
			origin: origin,
			direction: direction,
			speed: speed,
			config: config.projectile,
		};
		gamePlayer.projectileRecords.set(timestamp, projectileRecord);
		task.delay(config.projectile.lifetime, () => gamePlayer.projectileRecords.delete(timestamp));
		gamePlayer.lastFireProjectileTick = tick;

		gamePlayer.projectileCount--;
		task.delay(this.PROJECTILE_REFILL_TIME, () => gamePlayer.projectileCount++);

		this.playerStatsManager.incrementStat(gamePlayer.instance, "projectilesFired");

		Events.ProjectileFired.except(
			gamePlayer.instance,
			gamePlayer.instance,
			projectileRecord,
			gamePlayer.projectilePrefab,
		);
	}

	public handleRegisterProjectileHit(
		gamePlayer: GamePlayerComponent,
		hitType: ProjectileHitType,
		hitPart: BasePart,
		hitTimestamp: number,
		firedTimestamp: number,
	): void {
		if (!gamePlayer.combatEnabled) {
			warn(`${gamePlayer.instance.Name} does not have combat enabled`);
			return;
		}

		const projectileRecord = gamePlayer.projectileRecords.get(firedTimestamp);
		if (!projectileRecord) {
			warn(`${gamePlayer.instance.Name} registered a projectile hit for an invalid projectile`);
			return;
		}
		const config = projectileRecord.config;

		const dt = hitTimestamp - firedTimestamp;
		if (dt < 0 || dt > config.lifetime + PING_ERROR_TOLERANCE) {
			warn(`${gamePlayer.instance.Name} registered a projectile hit with an invalid timestamp difference`);
			return;
		}

		const velocity = projectileRecord.direction.mul(projectileRecord.speed);
		const acceleration = new Vector3(0, -config.gravity, 0);
		const position = Physics.calculatePosition(projectileRecord.origin, velocity, acceleration, dt);

		const maxPositionError =
			0.5 * math.max(hitPart.Size.X, hitPart.Size.Y, hitPart.Size.Z) + ORIGIN_ERROR_TOLERANCE;
		if (position.sub(hitPart.Position).Magnitude > maxPositionError) {
			warn(`${gamePlayer.instance.Name} registered a projectile hit with an invalid position`);
			return;
		}

		const hitParent = hitPart.Parent;
		if (!hitParent) {
			warn(`${gamePlayer.instance.Name} registered a projectile hit on a part with no parent`);
			return;
		}

		const damage =
			config.damage.baseDamage +
			config.damage.speedMultiplier * Physics.calculateVelocity(velocity, acceleration, dt).Magnitude;
		if (hitType === ProjectileHitType.Block) {
			if (hitParent !== this.Blocks) {
				warn(`${gamePlayer.instance.Name} registered a block projectile hit on a non-block part`);
				return;
			}
			if (hitPart.BrickColor === gamePlayer.team.TeamColor) {
				warn(`${gamePlayer.instance.Name} registered a block projectile hit on a friendly block`);
				return;
			}

			const block = this.components.getComponent<BlockComponent>(hitParent);
			if (!block) {
				warn(`${gamePlayer.instance.Name} registered a block projectile hit on a part with no block component`);
				return;
			}
			if (block.takeDamage(damage)) this.playerStatsManager.incrementStat(gamePlayer.instance, "blocksDestroyed");
		} else {
			const humanoid = hitParent.FindFirstChildOfClass("Humanoid");
			if (!humanoid) {
				warn(
					`${gamePlayer.instance.Name} registered a character projectile hit on an instance with no humanoid`,
				);
				return;
			}
			const player = Players.GetPlayerFromCharacter(hitParent);
			if (player && player.Team === gamePlayer.team) {
				warn(`${gamePlayer.instance.Name} registered a character projectile hit on a friendly player`);
				return;
			}

			humanoid.TakeDamage(damage);

			print(`${gamePlayer.instance.Name}'s projectile hit ${hitParent.Name} for ${math.round(damage)} damage`);

			if (humanoid.Health <= 0) {
				this.playerStatsManager.incrementStat(gamePlayer.instance, "kills");
				this.playerStatsManager.incrementStat(gamePlayer.instance, "damageDealt", damage);

				this.turfService.registerKill(gamePlayer.team);

				print(`${gamePlayer.instance.Name} killed ${hitParent.Name}`);

				if (player) {
					this.playerStatsManager.incrementStat(player, "deaths");
					this.playerStatsManager.incrementStat(player, "damageTaken", damage);
				}
			}
		}
	}
}
