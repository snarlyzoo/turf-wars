import { Component } from "@flamework/components";
import { Players, ReplicatedStorage, Workspace } from "@rbxts/services";
import { TWCharacterComponent, ViewmodelComponent } from "client/components/characters";
import { Events } from "client/network";
import { Projectile, ProjectileCaster, ProjectileHitType, ProjectileModifier } from "shared/projectiles";
import { ToolComponent } from "./ToolComponent";

const START_SPEED = 25;
const MAX_SPEED = 100;
const DRAW_SPEED = 35;

const RPM = 400;

const PROJECTILE_MODEL = ReplicatedStorage.FindFirstChild("Effects")?.FindFirstChild("Projectile") as Part;

@Component()
export class SlingshotComponent extends ToolComponent {
	private readonly Blocks: Folder = Workspace.FindFirstChild("Blocks") as Folder;

	private toFire: boolean = false;

	private teamColor!: BrickColor;

	private projectileImpactEvent = new Instance("BindableEvent");

	public override initialize(character: TWCharacterComponent, viewmodel: ViewmodelComponent): void {
		super.initialize(character, viewmodel);

		this.mouseIcon = "rbxassetid://textures/GunCursor.png";

		this.fetchTeamColor();

		this.projectileImpactEvent.Event.Connect((projectile, raycastResult) =>
			this.onProjectileImpact(projectile, raycastResult),
		);
	}

	public override usePrimaryAction(toActivate: boolean): void {
		this.fireProjectile(toActivate);
	}

	private fireProjectile(toFire: boolean): void {
		this.toFire = toFire;
		if (!this.equipped || this.isActive || !this.toFire || !this.twCharacter.combatEnabled) return;

		this.isActive = true;

		let speed = START_SPEED;
		const tick = os.clock();
		while (this.equipped && this.toFire && this.twCharacter.combatEnabled) task.wait();
		speed = math.min(speed + DRAW_SPEED * (os.clock() - tick), MAX_SPEED);

		if (this.equipped && this.twCharacter.combatEnabled) {
			const camCFrame = this.twCharacter.camera.CFrame;

			const timestamp = Workspace.GetServerTimeNow();
			Events.FireProjectile.fire(camCFrame.Position, camCFrame.LookVector, speed, timestamp);

			const raycastParams = new RaycastParams();
			raycastParams.FilterDescendantsInstances = [this.twCharacter.instance];
			raycastParams.FilterType = Enum.RaycastFilterType.Exclude;

			const projectileModifier: ProjectileModifier = {
				speed: speed,
				pvInstance: PROJECTILE_MODEL,
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

			task.wait(60 / RPM);
		}

		this.isActive = false;
	}

	private fetchTeamColor(): void {
		let teamColor = this.twCharacter.player.Team?.TeamColor;
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

			print("Projectile hit block");
			projectileHitType = ProjectileHitType.Block;
		} else {
			const humanoid = hitParent.FindFirstChildOfClass("Humanoid");
			if (!humanoid || humanoid.Health <= 0) return;

			const player = Players.GetPlayerFromCharacter(hitParent);
			if (player && player.Team === this.twCharacter.player.Team) return;

			print(`Projectile hit ${hitParent.Name}`);
			projectileHitType = ProjectileHitType.Character;
		}
		Events.RegisterProjectileHit.fire(projectileHitType, hitPart, Workspace.GetServerTimeNow(), firedTimestamp);
	}
}
