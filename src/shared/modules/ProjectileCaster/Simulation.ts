//!native
import { RunService, Workspace } from "@rbxts/services";
import { Queue } from "shared/classes/Queue";
import { Projectile, ProjectileModifier } from "shared/types/projectileTypes";
import { calculatePosition, calculateVelocity } from "shared/utility/physics";

export class Simulation {
	private readonly MAX_SIMULATION_TIME_FACTOR: number = 0.5;

	private readonly DEFAULT_PROJECTILE_MODIFIER = {
		speed: 100,
		gravity: 40,
		lifetime: 5,
	} as const;

	private queue: Queue<Projectile> = new Queue();

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
			...this.DEFAULT_PROJECTILE_MODIFIER,
			...projectileModifier,
		};

		const tick = os.clock();

		const projectile: Projectile = {
			position: origin,
			velocity: direction.mul(speed),
			acceleration: new Vector3(0, -gravity, 0),
			raycastParams,
			lifetime,
			startTick: tick,
			lastTick: tick,
			timestamp: projectileModifier?.timestamp,
			onImpact: projectileModifier?.onImpact,
		};

		if (projectileModifier?.pvInstance) {
			const pvInstance = projectileModifier.pvInstance.Clone();
			if (pvInstance.IsA("BasePart") && projectileModifier.color) pvInstance.Color = projectileModifier.color;
			pvInstance.Parent = this.folder;
			projectile.pvInstance = pvInstance;
		}

		this.queue.enqueue(projectile);
		this.incrementTasks(1);
	}

	private incrementTasks(amount: number): void {
		this.actor.SetAttribute("Tasks", (this.actor.GetAttribute("Tasks") as number) ?? 0 + amount);
	}

	private processProjectile(
		projectile: Projectile,
		impacted: Map<Projectile, RaycastResult>,
		destroyed: Array<Projectile>,
	): void {
		const tick = os.clock();
		const dt = tick - projectile.lastTick;
		const curPosition = projectile.position;
		const nextPosition = calculatePosition(curPosition, projectile.velocity, projectile.acceleration, dt);

		const raycastResult = Workspace.Raycast(curPosition, nextPosition.sub(curPosition), projectile.raycastParams);
		if (raycastResult) {
			impacted.set(projectile, raycastResult);
			destroyed.push(projectile);
			return;
		}

		if (tick - projectile.startTick > projectile.lifetime) {
			destroyed.push(projectile);
			return;
		}

		projectile.position = nextPosition;
		projectile.velocity = calculateVelocity(projectile.velocity, projectile.acceleration, dt);
		projectile.lastTick = tick;

		this.queue.enqueue(projectile);
	}

	private handleImpacts(impacted: Map<Projectile, RaycastResult>): void {
		for (const [projectile, raycastResult] of impacted) {
			if (projectile.onImpact) projectile.onImpact.Fire(projectile, raycastResult);
		}
	}

	private cleanupDestroyed(destroyed: Array<Projectile>): void {
		for (const projectile of destroyed) {
			if (projectile.pvInstance) projectile.pvInstance.Destroy();
			this.incrementTasks(-1);
		}
	}

	private onPreSimulation(): void {
		this.frameStartTick = os.clock();
	}

	private onPostSimulation(deltaTime: number): void {
		debug.profilebegin("ProjectileCaster onPostSimulation");

		const startTick = os.clock();
		const maxSimTime = (deltaTime - (startTick - this.frameStartTick)) * this.MAX_SIMULATION_TIME_FACTOR;

		const impacted: Map<Projectile, RaycastResult> = new Map();
		const destroyed: Array<Projectile> = [];
		for (let i = 0; i < this.queue.size(); i++) {
			if (os.clock() - startTick > maxSimTime) {
				warn("Simulation exceeded maximum time limit");
				break;
			}
			this.processProjectile(this.queue.dequeue()!, impacted, destroyed);
		}

		debug.profileend();

		task.synchronize();

		this.handleImpacts(impacted);
		this.cleanupDestroyed(destroyed);
	}

	private onPreRender(): void {
		debug.profilebegin("ProjectileCaster onPreRender");

		const parts: Array<BasePart> = [];
		const cframes: Array<CFrame> = [];
		for (let i = 0; i < this.queue.size(); i++) {
			const projectile = this.queue.dequeue()!;

			const pvInstance = projectile.pvInstance;
			if (!pvInstance) continue;

			const cframe = CFrame.lookAt(projectile.position, projectile.position.add(projectile.velocity));
			if (pvInstance.IsA("BasePart")) {
				parts.push(pvInstance);
				cframes.push(cframe);
			} else {
				pvInstance.PivotTo(cframe);
			}

			this.queue.enqueue(projectile);
		}

		debug.profileend();

		task.synchronize();

		if (parts.size() > 0) Workspace.BulkMoveTo(parts, cframes);
	}
}
