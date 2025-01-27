import { Service } from "@flamework/core";
import { TWPlayerComponent } from "server/components";
import { Events } from "server/network";
import { ToolType } from "shared/types/toolTypes";

@Service()
export class CharacterActionService {
	public handleUpdateCharacterTilt(twPlayer: TWPlayerComponent, angle: number): void {
		if (!twPlayer.isAlive) {
			warn(`${twPlayer.instance.Name} is not alive`);
			return;
		}

		const character = twPlayer.getCharacter();
		if (!character) return;

		Events.CharacterTiltChanged.except(twPlayer.instance, character, angle);
	}

	public handleEquipTool(twPlayer: TWPlayerComponent, toolType: ToolType): void {
		if (!twPlayer.isAlive) {
			warn(`${twPlayer.instance.Name} is not alive`);
			return;
		}

		const character = twPlayer.getCharacter();
		if (!character) return;

		const toolJoint = twPlayer.getToolJoint();
		if (!toolJoint) return;

		const tool = twPlayer.getTool(toolType);
		if (!tool) return;

		const curTool = twPlayer.getCurrentTool();
		if (curTool) {
			curTool.Parent = twPlayer.getBackpack();
		}

		toolJoint.Part1 = tool.PrimaryPart;
		tool.Parent = character;

		twPlayer.setCurrentTool(tool);

		Events.CharacterTiltChanged.except(twPlayer.instance, character);
	}

	public handleUnequipCurrentTool(twPlayer: TWPlayerComponent): void {
		const tool = twPlayer.getCurrentTool();
		if (!tool) {
			warn(`${twPlayer.instance.Name} does not have a tool equipped`);
			return;
		}

		const character = twPlayer.getCharacter();
		if (!character) return;

		const toolJoint = twPlayer.getToolJoint();
		if (!toolJoint) return;

		tool.Parent = twPlayer.getBackpack();
		toolJoint.Part1 = undefined;

		twPlayer.setCurrentTool(undefined);

		Events.CharacterTiltChanged.except(twPlayer.instance, character);
	}
}
