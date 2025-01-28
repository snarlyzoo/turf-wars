import { Service } from "@flamework/core";
import { Players, Workspace } from "@rbxts/services";
import { GamePlayerComponent } from "server/components/players";
import { Events } from "server/network";
import { PlayerRegistry } from "server/services";
import { ProjectileHitType, ProjectileRecord } from "shared/types/projectileTypes";
import { ToolType } from "shared/types/toolTypes";
import { Physics } from "shared/utility";

@Service()
export class ProjectileService {
	private readonly MAX_PING_ERROR: number = 0.05;
	private readonly MAX_ORIGIN_ERROR: number = 4;

	private readonly Blocks = Workspace.FindFirstChild("Blocks") as Folder;

	public constructor(private playerRegistry: PlayerRegistry) {}

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

		const character = gamePlayer.getCharacter();
		if (!character) return;

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

		const charPos = character.GetPivot().Position;
		if (charPos.sub(origin).Magnitude > this.MAX_ORIGIN_ERROR) {
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

		const serverTimestamp = Workspace.GetServerTimeNow();
		if (
			timestamp > serverTimestamp ||
			serverTimestamp - timestamp > gamePlayer.instance.GetNetworkPing() + this.MAX_PING_ERROR
		) {
			warn(`${gamePlayer.instance.Name} fired a projectile with an invalid timestamp`);
			return;
		}

		const tick = os.clock();
		if (tick - gamePlayer.lastFireProjectileTick < 60 / config.rateOfFire - this.MAX_PING_ERROR) {
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

		Events.ProjectileFired.except(gamePlayer.instance, gamePlayer.instance, projectileRecord);

		gamePlayer.lastFireProjectileTick = tick;
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

		const serverTimestamp = Workspace.GetServerTimeNow();
		if (
			hitTimestamp > serverTimestamp ||
			serverTimestamp - hitTimestamp > gamePlayer.instance.GetNetworkPing() + this.MAX_PING_ERROR
		) {
			warn(`${gamePlayer.instance.Name} registered a projectile hit with an invalid timestamp`);
			return;
		}

		const projectileRecord = gamePlayer.projectileRecords.get(firedTimestamp);
		if (!projectileRecord) {
			warn(`${gamePlayer.instance.Name} registered a projectile hit for an invalid projectile`);
			return;
		}
		const config = projectileRecord.config;

		const dt = hitTimestamp - firedTimestamp;
		if (dt < 0 || dt > config.lifetime + this.MAX_PING_ERROR) {
			warn(`${gamePlayer.instance.Name} registered a projectile hit with an invalid timestamp difference`);
			return;
		}

		const velocity = projectileRecord.direction.mul(projectileRecord.speed);
		const acceleration = new Vector3(0, -config.gravity, 0);
		const position = Physics.calculatePosition(projectileRecord.origin, velocity, acceleration, dt);

		const maxPositionError = 0.5 * math.max(hitPart.Size.X, hitPart.Size.Y, hitPart.Size.Z) + this.MAX_ORIGIN_ERROR;
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
			if (hitPart.BrickColor === gamePlayer.instance.TeamColor) {
				warn(`${gamePlayer.instance.Name} registered a block projectile hit on a friendly block`);
				return;
			}

			// TODO: Damage block
		} else {
			const humanoid = hitParent.FindFirstChildOfClass("Humanoid");
			if (!humanoid) {
				warn(
					`${gamePlayer.instance.Name} registered a character projectile hit on an instance with no humanoid`,
				);
				return;
			}
			const player = Players.GetPlayerFromCharacter(hitParent);
			if (player && player.Team === gamePlayer.instance.Team) {
				warn(`${gamePlayer.instance.Name} registered a character projectile hit on a friendly player`);
				return;
			}

			humanoid.TakeDamage(damage);

			print(`${gamePlayer.instance.Name}'s projectile hit ${hitParent.Name} for ${math.round(damage)} damage`);

			if (humanoid.Health <= 0) {
				print(`${gamePlayer.instance.Name} killed ${hitParent.Name}`);
			}
		}
	}
}
