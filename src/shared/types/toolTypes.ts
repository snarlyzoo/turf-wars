import { ProjectileConfig } from "./projectileTypes";

export const enum ToolType {
	Hammer = "Hammer",
	Slingshot = "Slingshot",
}

type AnimationFolder = Folder & ToolAnimations;

export interface ToolInstance extends Model {
	Animations: Folder & {
		R6: AnimationFolder;
		R15: AnimationFolder;
		Viewmodel: AnimationFolder;
	};
	Handle: BasePart;
	Configuration?: Configuration;
}

export interface ToolAnimations {
	Idle: Animation;
	Equip: Animation;
}

export type SlingshotConfig = {
	drawSpeed: number;

	projectile: ProjectileConfig;

	rateOfFire: number;
};
