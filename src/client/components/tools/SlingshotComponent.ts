import { Component } from "@flamework/components";
import { Players, Workspace } from "@rbxts/services";
import { GameCharacterComponent } from "client/components/characters";
import { ViewmodelComponent } from "client/components/characters/addons";
import { Events } from "client/network";
import { ProjectileCaster } from "shared/modules";
import { Projectile, ProjectileHitType, ProjectileModifier } from "shared/types/projectileTypes";
import { SlingshotConfig } from "shared/types/toolTypes";
import { getSlingshotConfig } from "shared/utility/getConfig";
import { ToolComponent } from "./ToolComponent";

@Component()
export class SlingshotComponent extends ToolComponent {
	private readonly Blocks: Folder = Workspace.FindFirstChild("Blocks") as Folder;

	private toFire: boolean = false;

	private teamColor!: BrickColor;

	private config!: SlingshotConfig;

	private projectileImpactEvent = new Instance("BindableEvent");

	public override initialize(character: GameCharacterComponent, viewmodel: ViewmodelComponent): void {
		super.initialize(character, viewmodel);

		this.mouseIcon = "rbxassetid://textures/GunCursor.png";

		this.fetchTeamColor();

		this.config = getSlingshotConfig(this.instance.Configuration);

		this.projectileImpactEvent.Event.Connect((projectile, raycastResult) =>
			this.onProjectileImpact(projectile, raycastResult),
		);
	}

	public override usePrimaryAction(toActivate: boolean): void {
		this.fireProjectile(toActivate);
	}

	private fireProjectile(toFire: boolean): void {
		this.toFire = toFire;
		if (!this.equipped || this.isActive || !this.toFire || !this.gameCharacter.combatEnabled) return;

		this.isActive = true;

		let speed = this.config.projectile.startSpeed;
		const tick = os.clock();
		while (this.equipped && this.toFire && this.gameCharacter.combatEnabled) task.wait();
		speed = math.min(speed + this.config.drawSpeed * (os.clock() - tick), this.config.projectile.maxSpeed);

		if (this.equipped && this.gameCharacter.combatEnabled) {
			const camCFrame = this.gameCharacter.camera.CFrame;

			const timestamp = Workspace.GetServerTimeNow();
			Events.FireProjectile.fire(camCFrame.Position, camCFrame.LookVector, speed, timestamp);

			const raycastParams = new RaycastParams();
			raycastParams.FilterDescendantsInstances = [this.gameCharacter.instance];
			raycastParams.FilterType = Enum.RaycastFilterType.Exclude;

			const projectileModifier: ProjectileModifier = {
				speed: speed,
				pvInstance: this.config.projectile.pvInstance,
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

			task.wait(60 / this.config.rateOfFire);
		}

		this.isActive = false;
	}

	private fetchTeamColor(): void {
		let teamColor = this.gameCharacter.player.Team?.TeamColor;
		if (!teamColor) {
			warn("Player does not have a team color");
			teamColor = new BrickColor("Medium stone grey");
		}
		this.teamColor = teamColor;
	}

	private onProjectileImpact(projectile: Projectile, raycastResult: RaycastResult): void {
		const hitPart = raycastResult.Instance;
		if (!hitPart) return;

		const hitParent = hitPart.Parent;
		if (!hitParent) return;

		const firedTimestamp = projectile.timestamp;
		if (firedTimestamp === undefined) {
			warn("Projectile fired without timestamp");
			return;
		}

		let projectileHitType: ProjectileHitType;
		if (hitParent === this.Blocks) {
			if (hitPart.BrickColor === this.teamColor) return;

			projectileHitType = ProjectileHitType.Block;
		} else {
			const humanoid = hitParent.FindFirstChildOfClass("Humanoid");
			if (!humanoid || humanoid.Health <= 0) return;

			const player = Players.GetPlayerFromCharacter(hitParent);
			if (player && player.Team === this.gameCharacter.player.Team) return;

			projectileHitType = ProjectileHitType.Character;
		}

		const damage =
			this.config.projectile.damage.baseDamage +
			this.config.projectile.damage.speedMultiplier * projectile.velocity.Magnitude;
		print(`Projectile hit ${hitParent.Name} for ${math.round(damage)} damage`);

		Events.RegisterProjectileHit.fire(projectileHitType, hitPart, Workspace.GetServerTimeNow(), firedTimestamp);
	}
}
