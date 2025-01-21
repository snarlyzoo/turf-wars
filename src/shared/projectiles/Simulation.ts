//!native
import { RunService, Workspace } from "@rbxts/services";
import { calculatePosition, calculateVelocity } from "shared/utility/physics";
import { Projectile, ProjectileModifier } from "./projectileTypes";

const MAX_SIMULATION_TIME_FACTOR = 0.5;

const DEFAULT_PROJECTILE_MODIFIER = {
	speed: 100,
	gravity: 40,
	lifetime: 5,
};

export class Simulation {
	private queue: Array<Projectile> = [];

	private frameStartTick: number = 0;

	public constructor(private actor: Actor, private folder: Folder) {
		this.actor.BindToMessage("CastProjectile", (origin, direction, raycastParams, modifier) =>
			this.castProjectile(origin, direction, raycastParams, modifier),
		);

		RunService.PreSimulation.Connect(() => this.onPreSimulation());
		RunService.PostSimulation.ConnectParallel((deltaTime) => this.onPostSimulation(deltaTime));
		RunService.PreRender.ConnectParallel(() => this.onPreRender());
	}

	private castProjectile(
		origin: Vector3,
		direction: Vector3,
		raycastParams: RaycastParams,
		projectileModifier?: ProjectileModifier,
	): void {
		const { speed, gravity, lifetime } = {
			...DEFAULT_PROJECTILE_MODIFIER,
			...projectileModifier,
		};
		const tick = os.clock();

		const projectile: Projectile = {
			position: origin,
			velocity: direction.mul(speed),
			acceleration: new Vector3(0, -gravity, 0),

			raycastParams: raycastParams,

			lifetime: lifetime,
			startTick: tick,
			lastTick: tick,

			timestamp: projectileModifier?.timestamp,

			onImpact: projectileModifier?.onImpact,
		};

		if (projectileModifier?.pvInstance) {
			const pvInstance = projectileModifier.pvInstance.Clone();
			if (pvInstance.IsA("BasePart") && projectileModifier.color) {
				pvInstance.Color = projectileModifier.color;
			}
			pvInstance.Parent = this.folder;
			projectile.pvInstance = pvInstance;
		}

		this.queue.push(projectile);

		this.incrementTasks(1);
	}

	private incrementTasks(amount: number): void {
		this.actor.SetAttribute("Tasks", (this.actor.GetAttribute("Tasks") as number) ?? 0 + amount);
	}

	private onPreSimulation(): void {
		this.frameStartTick = os.clock();
	}

	private onPostSimulation(deltaTime: number): void {
		debug.profilebegin("Projectile Simulation");

		const startTick = os.clock();
		const maxSimTime = (deltaTime - (startTick - this.frameStartTick)) * MAX_SIMULATION_TIME_FACTOR;

		const impacted: Map<Projectile, RaycastResult> = new Map();
		const destroyed: Array<Projectile> = [];
		for (let i = 0; i < this.queue.size(); i++) {
			const tick = os.clock();
			if (tick - startTick > maxSimTime) {
				warn("Simulation exceeded maximum time limit");
				break;
			}

			const projectile = this.queue.shift()!;

			const dt = tick - projectile.lastTick;
			const curPosition = projectile.position;
			const nextPosition = calculatePosition(curPosition, projectile.velocity, projectile.acceleration, dt);

			const raycastResult = Workspace.Raycast(
				curPosition,
				nextPosition.sub(curPosition),
				projectile.raycastParams,
			);
			if (raycastResult) {
				impacted.set(projectile, raycastResult);
				destroyed.push(projectile);
				continue;
			}

			if (tick - projectile.startTick > projectile.lifetime) {
				destroyed.push(projectile);
				continue;
			}

			projectile.position = nextPosition;
			projectile.velocity = calculateVelocity(projectile.velocity, projectile.acceleration, dt);
			projectile.lastTick = tick;

			this.queue.push(projectile);
		}

		debug.profileend();

		task.synchronize();

		for (const [projectile, raycastResult] of impacted) {
			if (projectile.onImpact) {
				projectile.onImpact.Fire(raycastResult);
			}
		}

		for (const projectile of destroyed) {
			if (projectile.pvInstance) {
				projectile.pvInstance.Destroy();
			}
			this.incrementTasks(-1);
		}
	}

	private onPreRender(): void {
		const parts: Array<BasePart> = [];
		const cframes: Array<CFrame> = [];
		for (let i = 0; i < this.queue.size(); i++) {
			const projectile = this.queue[i];

			const pvInstance = projectile.pvInstance;
			if (!pvInstance) {
				continue;
			}

			const cframe = CFrame.lookAt(projectile.position, projectile.position.add(projectile.velocity));
			if (pvInstance.IsA("BasePart")) {
				parts.push(pvInstance);
				cframes.push(cframe);
			} else {
				pvInstance.PivotTo(cframe);
			}
		}

		task.synchronize();

		if (parts.size() > 0) {
			Workspace.BulkMoveTo(parts, cframes);
		}
	}
}
