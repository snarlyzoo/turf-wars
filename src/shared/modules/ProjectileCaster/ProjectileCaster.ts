import { ReplicatedFirst, Workspace } from "@rbxts/services";
import { PriorityQueue } from "shared/classes/queues";
import { ProjectileModifier } from "shared/types/projectileTypes";

export abstract class ProjectileCaster {
	private static readonly THREAD_COUNT: number = 8;

	private static actorFolder: Folder;
	private static projectileFolder: Folder;

	private static actorQueue: PriorityQueue<Actor>;

	public static initialize(): void {
		print("Initializing projectile caster...");

		this.createFolders();
		this.createActors();

		task.defer(() => {
			const initializedActors: Actor[] = [];
			for (let i = 0; i < this.THREAD_COUNT; i++) {
				const actor = this.actorQueue.dequeue();
				if (!actor) {
					warn("No available actors to initialize");
					break;
				}

				actor.SendMessage("Initialize", this.projectileFolder);
				initializedActors.push(actor);
			}
			for (const actor of initializedActors) {
				this.actorQueue.enqueue(actor);
			}

			print("Projectile caster initialized.");
		});
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
		const controllerScript = script.Parent?.FindFirstChild("controller") as LocalScript;
		if (!controllerScript) error("Controller script not found");

		this.actorQueue = new PriorityQueue<Actor>((a, b) => {
			const aTasks = (a.GetAttribute("Tasks") as number) ?? 0;
			const bTasks = (b.GetAttribute("Tasks") as number) ?? 0;
			return aTasks - bTasks;
		});

		for (let i = 0; i < this.THREAD_COUNT; i++) {
			const actor = new Instance("Actor");
			actor.Parent = this.actorFolder;

			const controller = controllerScript.Clone();
			controller.Disabled = false;
			controller.Parent = actor;

			actor.SetAttribute("Tasks", 0);
			this.actorQueue.enqueue(actor);
		}
	}
}
