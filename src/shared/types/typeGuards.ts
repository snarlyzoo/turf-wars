import { Flamework } from "@flamework/core";
import { R6CharacterInstance } from "./characterTypes";
import { ToolInstance } from "./toolTypes";

export const isR6Character = Flamework.createGuard<R6CharacterInstance>();

export const isToolInstance = Flamework.createGuard<ToolInstance>();
