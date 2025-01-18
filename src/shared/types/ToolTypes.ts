export const enum ToolType {
	Hammer = "Hammer",
	Slingshot = "Slingshot",
}

export interface ToolInstance extends Model {
	Animations: Folder & {
		Idle: Animation;
		Equip: Animation;
	};
	Handle: BasePart;
	Configuration: Configuration;
}
