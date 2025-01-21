import { ReplicatedFirst, RunService, Workspace } from "@rbxts/services";
import { ProjectileModifier } from "./projectileTypes";

const THREAD_COUNT = 8;

export abstract class ProjectileCaster {
	private static actorFolder: Folder;
	private static projectileFolder: Folder;

	private static actors: Array<Actor> = [];

	public static initialize(): void {
		this.createFolders();
		this.createActors();

		RunService.PostSimulation.Wait();

		for (const actor of this.actors) {
			actor.SendMessage("Initialize", this.projectileFolder);
		}
	}

	public static castProjectile(
		origin: Vector3,
		direction: Vector3,
		raycastParams: RaycastParams,
		projectileModifier?: ProjectileModifier,
	): void {
		table.sort(this.actors, (a, b) => {
			return ((a.GetAttribute("Tasks") as number) ?? 0) < ((b.GetAttribute("Tasks") as number) ?? 0);
		});
		this.actors[0].SendMessage("CastProjectile", origin, direction, raycastParams, projectileModifier);
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
		if (!controllerScript) {
			error("Controller script not found");
		}

		for (let i = 0; i < THREAD_COUNT; i++) {
			const actor = new Instance("Actor");
			actor.Parent = this.actorFolder;

			const controller = controllerScript.Clone();
			controller.Disabled = false;
			controller.Parent = actor;

			this.actors.push(actor);
		}
	}
}
