import { Component } from "@flamework/components";
import { Players, Workspace } from "@rbxts/services";
import { Events } from "client/network";
import { BlockComponent } from "shared/components";
import { ProjectileCaster } from "shared/modules";
import { Projectile, ProjectileHitType, ProjectileModifier } from "shared/types/projectileTypes";
import { ResourceType, SlingshotConfig, ToolType } from "shared/types/toolTypes";
import { getSlingshotConfig } from "shared/utility";
import { ToolComponent } from "./ToolComponent";

@Component()
export class SlingshotComponent extends ToolComponent {
	private readonly PROJECTILE_REFILL_TIME: number = 5;

	public override toolType = ToolType.Slingshot;
	public override resourceType = ResourceType.Projectile;

	public override hasSecondaryAction = false;

	private toFire: boolean = false;

	private teamColor!: BrickColor;

	private config!: SlingshotConfig;

	private projectileImpactEvent = new Instance("BindableEvent");

	public override async onStart(): Promise<void> {
		await super.onStart();

		this.mouseIcon = "rbxassetid://textures/GunCursor.png";

		this.fetchTeamColor();

		this.config = getSlingshotConfig(this.instance.FindFirstChildOfClass("Configuration"));

		this.projectileImpactEvent.Event.Connect((projectile, raycastResult) =>
			this.onProjectileImpact(projectile, raycastResult),
		);
	}

	public override usePrimaryAction(toActivate: boolean): void {
		this.fireProjectile(toActivate);
	}

	private fireProjectile(toFire: boolean): void {
		this.toFire = toFire;
		if (!this.equipped || this.isActive || !this.toFire) return;
		if (!this.characterController.combatEnabled || this.characterController.projectileCount <= 0) return;

		this.isActive = true;

		let speed = this.config.projectile.startSpeed;
		const tick = os.clock();
		while (this.equipped && this.toFire && this.characterController.combatEnabled) task.wait();
		speed = math.min(speed + this.config.drawSpeed * (os.clock() - tick), this.config.projectile.maxSpeed);

		if (this.equipped && this.characterController.combatEnabled) {
			const camCFrame = this.characterController.camera.CFrame;

			const timestamp = Workspace.GetServerTimeNow();
			Events.FireProjectile.fire(camCFrame.Position, camCFrame.LookVector, speed, timestamp);

			const raycastParams = new RaycastParams();
			raycastParams.FilterDescendantsInstances = [this.gameCharacter.instance];
			raycastParams.FilterType = Enum.RaycastFilterType.Exclude;

			const projectileModifier: ProjectileModifier = {
				speed: speed,
				pvInstance: this.characterController.projectilePrefab,
				color: this.teamColor.Color,
				timestamp: timestamp,
				onImpact: this.projectileImpactEvent,
			};
			ProjectileCaster.castProjectile(
				camCFrame.Position,
				camCFrame.LookVector,
				raycastParams,
				projectileModifier,
			);

			this.characterController.projectileCount--;
			task.delay(this.PROJECTILE_REFILL_TIME, () => this.characterController.projectileCount++);

			task.wait(60 / this.config.rateOfFire);
		}

		this.isActive = false;
	}

	private fetchTeamColor(): void {
		let teamColor = this.characterController.team.TeamColor;
		if (!teamColor) {
			warn("Player does not have a team color");
			teamColor = new BrickColor("Medium stone grey");
		}
		this.teamColor = teamColor;
	}

	private onProjectileImpact(projectile: Projectile, raycastResult: RaycastResult): void {
		const hitPart = raycastResult.Instance;
		if (!hitPart) return;

		const firedTimestamp = projectile.timestamp;
		if (firedTimestamp === undefined) {
			warn("Projectile fired without timestamp");
			return;
		}

		let hitName: string = hitPart.Name;
		let projectileHitType: ProjectileHitType;
		if (hitPart.HasTag("Block")) {
			const block = this.components.getComponent<BlockComponent>(hitPart);
			if (!block || block.attributes.TeamColor === this.characterController.team.TeamColor) return;

			projectileHitType = ProjectileHitType.Block;
		} else {
			const character = hitPart.Parent;
			if (!character) return;

			const humanoid = character.FindFirstChildOfClass("Humanoid");
			if (!humanoid || humanoid.Health <= 0) return;

			const player = Players.GetPlayerFromCharacter(character);
			if (player && player.Team === this.characterController.team) return;

			hitName = `${character.Name}'s ${hitPart.Name}`;
			projectileHitType = ProjectileHitType.Character;
		}

		const damage =
			this.config.projectile.damage.baseDamage +
			this.config.projectile.damage.speedMultiplier * projectile.velocity.Magnitude;
		print(`Projectile hit ${hitName} for ${damage} damage`);

		Events.RegisterProjectileHit.fire(projectileHitType, hitPart, Workspace.GetServerTimeNow(), firedTimestamp);
	}
}
