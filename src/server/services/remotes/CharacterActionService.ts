import { Service } from "@flamework/core";
import { TWPlayerComponent } from "server/components";
import { Events } from "server/network";
import { ToolType } from "shared/types/toolTypes";

@Service()
export class CharacterActionService {
	public updateCharacterTilt(twPlayer: TWPlayerComponent, angle: number): void {
		if (!twPlayer.isAlive) {
			warn(`${twPlayer.instance.Name} is not alive`);
			return;
		}

		const character = twPlayer.getCharacter();
		if (!character) {
			warn(`${twPlayer.instance.Name} does not have a character`);
			return;
		}

		Events.CharacterTiltChanged.except(twPlayer.instance, character, angle);
	}

	public handleToolEquip(twPlayer: TWPlayerComponent, toolType: ToolType): void {
		if (!twPlayer.isAlive) {
			warn(`${twPlayer.instance.Name} is not alive`);
			return;
		}

		const character = twPlayer.getCharacter();
		if (!character) {
			warn(`${twPlayer.instance.Name} does not have a character`);
			return;
		}

		const toolJoint = twPlayer.getToolJoint();
		if (!toolJoint) {
			warn(`${twPlayer.instance.Name} does not have a tool joint`);
			return;
		}

		const tool = twPlayer.getTool(toolType);
		if (!tool) {
			warn(`${twPlayer.instance.Name} does not have a ${toolType}`);
			return;
		}

		const curTool = twPlayer.getCurrentTool();
		if (curTool) {
			curTool.Parent = twPlayer.getBackpack();
		}

		toolJoint.Part1 = tool.PrimaryPart;
		tool.Parent = character;

		twPlayer.setCurrentTool(tool);

		Events.CharacterTiltChanged.except(twPlayer.instance, character);
	}

	public handleCurrentToolUnequip(twPlayer: TWPlayerComponent): void {
		const tool = twPlayer.getCurrentTool();
		if (!tool) {
			warn(`${twPlayer.instance.Name} does not have a tool equipped`);
			return;
		}

		const character = twPlayer.getCharacter();
		if (!character) {
			warn(`${twPlayer.instance.Name} does not have a character`);
			return;
		}

		const toolJoint = twPlayer.getToolJoint();
		if (!toolJoint) {
			warn(`${twPlayer.instance.Name} does not have a tool joint`);
			return;
		}

		tool.Parent = twPlayer.getBackpack();
		toolJoint.Part1 = undefined;

		twPlayer.setCurrentTool(undefined);

		Events.CharacterTiltChanged.except(twPlayer.instance, character);
	}
}
