import { ReplicatedFirst, Workspace } from "@rbxts/services";
import { PriorityQueue } from "shared/classes";
import { ProjectileModifier } from "shared/types/projectileTypes";

abstract class ProjectileCaster {
	private static readonly THREAD_COUNT: number = 8;

	private static actorFolder: Folder;
	private static projectileFolder: Folder;

	private static actorQueue: PriorityQueue<Actor>;

	public static async initialize(): Promise<void> {
		this.createFolders();
		this.createActors();

		return new Promise((resolve, reject) =>
			task.defer(() => {
				try {
					const initializedActors: Actor[] = [];
					for (let i = 0; i < this.THREAD_COUNT; i++) {
						const actor = this.actorQueue.dequeue();
						if (!actor) throw `Failed to dequeue actor at index ${i}`;

						actor.SendMessage("Initialize", this.projectileFolder);
						initializedActors.push(actor);
					}
					initializedActors.forEach((actor) => this.actorQueue.enqueue(actor));
					resolve();
				} catch (err) {
					reject(err);
				}
			}),
		);
	}

	public static castProjectile(
		origin: Vector3,
		direction: Vector3,
		raycastParams: RaycastParams,
		projectileModifier?: ProjectileModifier,
	): void {
		const actor = this.actorQueue.dequeue();
		if (!actor) {
			warn("No available actors to cast projectile");
			return;
		}

		actor.SendMessage("CastProjectile", origin, direction, raycastParams, projectileModifier);

		this.actorQueue.enqueue(actor);
	}

	private static createFolders(): void {
		this.actorFolder = new Instance("Folder");
		this.actorFolder.Name = "PROJECTILE_CASTER_ACTORS";
		this.actorFolder.Parent = ReplicatedFirst;

		this.projectileFolder = new Instance("Folder");
		this.projectileFolder.Name = "PROJECTILE_CASTER_VISUALS";
		this.projectileFolder.Parent = Workspace;
	}

	private static createActors(): void {
		const controllerPrefab = script.Parent?.FindFirstChild("controller");
		if (!controllerPrefab || !controllerPrefab.IsA("LocalScript")) {
			error("Controller prefab not found");
		}

		this.actorQueue = new PriorityQueue<Actor>((a, b) => {
			const aTasks = (a.GetAttribute("Tasks") as number) ?? 0;
			const bTasks = (b.GetAttribute("Tasks") as number) ?? 0;
			return aTasks - bTasks;
		});

		for (let i = 0; i < this.THREAD_COUNT; i++) {
			const actor = new Instance("Actor");
			actor.Parent = this.actorFolder;

			const controller = controllerPrefab.Clone();
			controller.Disabled = false;
			controller.Parent = actor;

			actor.SetAttribute("Tasks", 0);
			this.actorQueue.enqueue(actor);
		}
	}
}

export default ProjectileCaster;
