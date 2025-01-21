export const enum ToolType {
	Hammer = "Hammer",
	Slingshot = "Slingshot",
}

export interface ToolInstance extends Model {
	Animations: Folder & {
		R6: Folder & ToolAnimations;
		R15: Folder & ToolAnimations;
		Viewmodel: Folder & ToolAnimations;
	};
	Handle: BasePart;
	Configuration: Configuration;
}

export interface ToolAnimations {
	Idle: Animation;
	Equip: Animation;
}
