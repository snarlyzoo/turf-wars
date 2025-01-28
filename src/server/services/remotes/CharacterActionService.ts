import { Service } from "@flamework/core";
import { PlayerComponent, GamePlayerComponent } from "server/components/players";
import { Events } from "server/network";
import { ToolType } from "shared/types/toolTypes";

@Service()
export class CharacterActionService {
	public handleUpdateCharacterTilt(playerComponent: PlayerComponent, angle: number): void {
		if (!playerComponent.isAlive) {
			warn(`${playerComponent.instance.Name} is not alive`);
			return;
		}

		const character = playerComponent.getCharacter();
		if (!character) return;

		Events.CharacterTiltChanged.except(playerComponent.instance, character, angle);
	}

	public handleEquipTool(gamePlayer: GamePlayerComponent, toolType: ToolType): void {
		if (!gamePlayer.isAlive) {
			warn(`${gamePlayer.instance.Name} is not alive`);
			return;
		}

		const character = gamePlayer.getCharacter();
		if (!character) return;

		const toolJoint = gamePlayer.getToolJoint();
		if (!toolJoint) return;

		const tool = gamePlayer.getTool(toolType);
		if (!tool) return;

		const curTool = gamePlayer.getCurrentTool();
		if (curTool) {
			curTool.Parent = gamePlayer.getBackpack();
		}

		toolJoint.Part1 = tool.PrimaryPart;
		tool.Parent = character;

		gamePlayer.setCurrentTool(tool);

		Events.CharacterTiltChanged.except(gamePlayer.instance, character);
	}

	public handleUnequipCurrentTool(gamePlayer: GamePlayerComponent): void {
		const tool = gamePlayer.getCurrentTool();
		if (!tool) {
			warn(`${gamePlayer.instance.Name} does not have a tool equipped`);
			return;
		}

		const character = gamePlayer.getCharacter();
		if (!character) return;

		const toolJoint = gamePlayer.getToolJoint();
		if (!toolJoint) return;

		tool.Parent = gamePlayer.getBackpack();
		toolJoint.Part1 = undefined;

		gamePlayer.setCurrentTool(undefined);

		Events.CharacterTiltChanged.except(gamePlayer.instance, character);
	}
}
