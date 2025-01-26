import { Service } from "@flamework/core";
import { Players, Workspace } from "@rbxts/services";
import { TWPlayerComponent } from "server/components";
import { Events } from "server/network";
import { PlayerRegistry } from "server/services/PlayerRegistry";
import { ProjectileHitType, ProjectileRecord } from "shared/projectiles";
import { calculatePosition } from "shared/utility/physics";

@Service()
export class SlingshotActionService {
	private readonly MAX_PING_ERROR: number = 0.05;
	private readonly MAX_ORIGIN_ERROR: number = 4;

	private readonly MAX_PROJECTILE_SPEED: number = 100;
	private readonly PROJECTILE_GRAVITY: number = 40;
	private readonly PROJECTILE_LIFETIME: number = 5;

	private readonly SLINGSHOT_RPM: number = 400;
	private readonly SLINGSHOT_BASE_DAMAGE: number = 50;
	private readonly SLINGSHOT_DAMAGE_MULTIPLIER: number = 0.5;

	private readonly Blocks = Workspace.FindFirstChild("Blocks") as Folder;

	public constructor(private playerRegistry: PlayerRegistry) {}

	public handleProjectileFire(
		twPlayer: TWPlayerComponent,
		origin: Vector3,
		direction: Vector3,
		speed: number,
		timestamp: number,
	): void {
		if (!twPlayer.combatEnabled) {
			warn(`${twPlayer.instance.Name} does not have combat enabled`);
			return;
		}

		if (!twPlayer.isAlive) {
			warn(`${twPlayer.instance.Name} is not alive`);
			return;
		}

		const character = twPlayer.getCharacter();
		if (!character) {
			warn(`${twPlayer.instance.Name} does not have a character`);
			return;
		}

		const tool = twPlayer.getCurrentTool();
		if (!tool || !tool.HasTag("Slingshot")) {
			warn(`${twPlayer.instance.Name} does not have a slingshot equipped`);
			return;
		}

		const charPos = character.GetPivot().Position;
		if (charPos.sub(origin).Magnitude > this.MAX_ORIGIN_ERROR) {
			warn(`${twPlayer.instance.Name} fired a projectile with an invalid origin`);
			return;
		}

		if (direction === Vector3.zero) {
			this.playerRegistry.kickPlayer(twPlayer.instance, "firing a projectile with an invalid direction");
			return;
		}
		direction = direction.Unit;

		if (speed <= 0 || speed > this.MAX_PROJECTILE_SPEED) {
			this.playerRegistry.kickPlayer(twPlayer.instance, "firing a projectile with an invalid speed");
			return;
		}

		const serverTimestamp = Workspace.GetServerTimeNow();
		if (
			timestamp > serverTimestamp ||
			serverTimestamp - timestamp > twPlayer.instance.GetNetworkPing() + this.MAX_PING_ERROR
		) {
			warn(`${twPlayer.instance.Name} fired a projectile with an invalid timestamp`);
			return;
		}

		const tick = os.clock();
		if (tick - twPlayer.lastFireProjectileTick < 60 / this.SLINGSHOT_RPM - this.MAX_PING_ERROR) {
			this.playerRegistry.addKickOffense(twPlayer.instance, "firing a projectile too quickly");
			return;
		}

		const projectileRecord: ProjectileRecord = {
			origin: origin,
			direction: direction,
			speed: speed,
		};
		twPlayer.projectileRecords.set(timestamp, projectileRecord);
		task.delay(this.PROJECTILE_LIFETIME, () => twPlayer.projectileRecords.delete(timestamp));

		Events.ProjectileFired.except(twPlayer.instance, twPlayer.instance, projectileRecord);

		twPlayer.lastFireProjectileTick = tick;
	}

	public registerProjectileHit(
		twPlayer: TWPlayerComponent,
		hitType: ProjectileHitType,
		hitPart: BasePart,
		hitTimestamp: number,
		firedTimestamp: number,
	): void {
		if (!twPlayer.combatEnabled) {
			warn(`${twPlayer.instance.Name} does not have combat enabled`);
			return;
		}

		const serverTimestamp = Workspace.GetServerTimeNow();
		if (
			hitTimestamp > serverTimestamp ||
			serverTimestamp - hitTimestamp > twPlayer.instance.GetNetworkPing() + this.MAX_PING_ERROR
		) {
			warn(`${twPlayer.instance.Name} registered a projectile hit with an invalid timestamp`);
			return;
		}

		const dt = hitTimestamp - firedTimestamp;
		if (dt < 0 || dt > this.PROJECTILE_LIFETIME + this.MAX_PING_ERROR) {
			warn(`${twPlayer.instance.Name} registered a projectile hit with an invalid timestamp difference`);
			return;
		}

		const projectileRecord = twPlayer.projectileRecords.get(firedTimestamp);
		if (!projectileRecord) {
			warn(`${twPlayer.instance.Name} registered a projectile hit for an invalid projectile`);
			return;
		}

		const position = calculatePosition(
			projectileRecord.origin,
			projectileRecord.direction.mul(projectileRecord.speed),
			new Vector3(0, -this.PROJECTILE_GRAVITY, 0),
			dt,
		);
		const maxPositionError = 0.5 * math.max(hitPart.Size.X, hitPart.Size.Y, hitPart.Size.Z) + this.MAX_ORIGIN_ERROR;
		if (position.sub(hitPart.Position).Magnitude > maxPositionError) {
			warn(`${twPlayer.instance.Name} registered a projectile hit with an invalid position`);
			return;
		}

		const hitParent = hitPart.Parent;
		if (!hitParent) {
			warn(`${twPlayer.instance.Name} registered a projectile hit on a part with no parent`);
			return;
		}

		const damage = this.SLINGSHOT_BASE_DAMAGE + this.SLINGSHOT_DAMAGE_MULTIPLIER * projectileRecord.speed;
		if (hitType === ProjectileHitType.Block) {
			if (hitParent !== this.Blocks) {
				warn(`${twPlayer.instance.Name} registered a block projectile hit on a non-block part`);
				return;
			}
			if (hitPart.BrickColor === twPlayer.instance.TeamColor) {
				warn(`${twPlayer.instance.Name} registered a block projectile hit on a friendly block`);
				return;
			}

			// TODO: Damage block
		} else {
			const humanoid = hitParent.FindFirstChildOfClass("Humanoid");
			if (!humanoid) {
				warn(`${twPlayer.instance.Name} registered a character projectile hit on an instance with no humanoid`);
				return;
			}
			const player = Players.GetPlayerFromCharacter(hitParent);
			if (player && player.Team === twPlayer.instance.Team) {
				warn(`${twPlayer.instance.Name} registered a character projectile hit on a friendly player`);
				return;
			}

			humanoid.TakeDamage(damage);

			print(`${twPlayer.instance.Name} hit ${hitParent.Name} for ${math.round(damage)} damage`);

			if (humanoid.Health <= 0) {
				print(`${twPlayer.instance.Name} killed ${hitParent.Name}`);
			}
		}
	}
}
