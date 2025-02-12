import { Flamework } from "@flamework/core";
import { ProjectileCaster } from "shared/modules";

Flamework.addPaths("src/client/components");
Flamework.addPaths("src/client/controllers");
Flamework.addPaths("src/shared/components");

print("Flamework ignite!");
Flamework.ignite();

print("Initializing ProjectileCaster...");
ProjectileCaster.initialize().andThen(() => print("ProjectileCaster initialized!"));
