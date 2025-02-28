export enum CharacterType {
	None = "None",
	Lobby = "Lobby",
	Game = "Game",
}

export interface HumanoidCharacterInstance extends Model {
	Humanoid: Humanoid & {
		Animator: Animator;
	};
	HumanoidRootPart: Part;
}

export interface R6CharacterInstance extends HumanoidCharacterInstance {
	["Left Arm"]: Part;
	["Right Arm"]: Part;
	Torso: Part & {
		["Left Shoulder"]: Motor6D;
		Neck: Motor6D;
		["Right Shoulder"]: Motor6D;
	};
}

export interface R15CharacterInstance extends HumanoidCharacterInstance {
	Head: Part & {
		Neck: Motor6D;
	};
	LeftUpperArm: Part & {
		LeftShoulder: Motor6D;
	};
	RightUpperArm: Part & {
		RightShoulder: Motor6D;
	};
	UpperTorso: Part;
}

export interface R6GameCharacterInstance extends R6CharacterInstance {
	Torso: R6CharacterInstance["Torso"] & {
		ToolJoint: Motor6D;
	};
}

export interface R15GameCharacterInstance extends R15CharacterInstance {
	UpperTorso: R15CharacterInstance["UpperTorso"] & {
		ToolJoint: Motor6D;
	};
}

export interface ViewmodelInstance extends HumanoidCharacterInstance {
	Torso: Part;
}
