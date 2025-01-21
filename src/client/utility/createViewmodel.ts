import { Players, RunService } from "@rbxts/services";
import { R6CharacterInstance, ViewmodelInstance } from "shared/types/characterTypes";

const VALID_DESCENDANTS = {
	["Body Colors"]: true,
	["Shirt"]: true,
	["Humanoid"]: true,
	["HumanoidRootPart"]: true,
	["Left Arm"]: true,
	["Right Arm"]: true,
	["Torso"]: true,
	["Left Shoulder"]: true,
	["Right Shoulder"]: true,
	["RootJoint"]: true,
};

const USER_ID = RunService.IsStudio() ? 107484074 : Players.LocalPlayer.UserId;

const VIEWMODEL_COLLISION_GROUP = "Viewmodel";

const ARM_SIZE = new Vector3(0.5, 2, 0.5);

export function createViewmodel(): ViewmodelInstance {
	const viewmodel = Players.CreateHumanoidModelFromDescription(
		Players.GetHumanoidDescriptionFromUserId(USER_ID),
		Enum.HumanoidRigType.R6,
	) as R6CharacterInstance;

	viewmodel.Name = "Viewmodel";

	viewmodel.HumanoidRootPart.Anchored = true;
	viewmodel.PrimaryPart = viewmodel.HumanoidRootPart;

	viewmodel.Humanoid.DisplayDistanceType = Enum.HumanoidDisplayDistanceType.None;
	viewmodel.Humanoid.EvaluateStateMachine = false;
	viewmodel.Humanoid.RequiresNeck = false;

	for (const descendant of viewmodel.GetDescendants()) {
		if (!(descendant.Name in VALID_DESCENDANTS)) {
			descendant.Destroy();
		} else if (descendant.IsA("BasePart")) {
			descendant.CastShadow = false;
			descendant.CollisionGroup = VIEWMODEL_COLLISION_GROUP;
			descendant.Massless = true;
		}
	}

	viewmodel.Torso.Transparency = 1;

	viewmodel["Left Arm"].Size = ARM_SIZE;
	viewmodel["Right Arm"].Size = ARM_SIZE;

	return viewmodel as ViewmodelInstance;
}
