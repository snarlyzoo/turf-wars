import { Flamework } from "@flamework/core";
import { ProjectileCaster } from "shared/modules/ProjectileCaster";

Flamework.addPaths("src/client/components");
Flamework.addPaths("src/client/controllers");
Flamework.addPaths("src/shared/components");

Flamework.ignite();
print("Flamework ignited!");

ProjectileCaster.initialize();
