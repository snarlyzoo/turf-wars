import { Simulation } from "./Simulation";

const actor = script.Parent as Actor;
actor.BindToMessage("Initialize", (folder: Folder) => {
	new Simulation(actor, folder);
});
