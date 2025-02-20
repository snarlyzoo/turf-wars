import { Flamework } from "@flamework/core";
import { mountUI } from "client/ui";
import { ProjectileCaster } from "shared/modules";

Flamework.addPaths("src/client/components");
Flamework.addPaths("src/client/controllers");
Flamework.addPaths("src/shared/components");

print("Flamework ignite!");
Flamework.ignite();

print("Mounting UI...");
mountUI();

print("Initializing ProjectileCaster...");
ProjectileCaster.initialize()
	.andThen(() => print("ProjectileCaster initialized!"))
	.catch((err) => error(`Failed to initialize ProjectileCaster: ${err}`));
