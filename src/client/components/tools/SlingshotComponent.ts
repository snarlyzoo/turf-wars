import { Component } from "@flamework/components";
import { Players, ReplicatedStorage, Workspace } from "@rbxts/services";
import { ProjectileCaster } from "shared/projectiles";
import { ToolComponent } from "./ToolComponent";
import { Events } from "client/network";
import { ProjectileModifier } from "shared/projectiles/projectileTypes";

const START_SPEED = 25;
const MAX_SPEED = 100;
const DRAW_SPEED = 35;

const RPM = 400;

const PROJECTILE_MODEL = ReplicatedStorage.FindFirstChild("Effects")?.FindFirstChild("Projectile") as Part;

@Component()
export class SlingshotComponent extends ToolComponent {
	private toFire: boolean = false;

	private projectileImpactEvent = new Instance("BindableEvent");

	public constructor() {
		super();
		this.mouseIcon = "rbxassetid://textures/GunCursor.png";
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

		print(`Firing projectile at speed: ${speed}`);

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
				color: this.twCharacter.player.Team?.TeamColor.Color,
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
}
