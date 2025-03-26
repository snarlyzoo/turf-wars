import { Component } from "@flamework/components";
import { CharacterType } from "shared/types/characterTypes";
import PlayerComponent from "./PlayerComponent";

@Component()
class LobbyPlayerComponent extends PlayerComponent {
	public override characterType = CharacterType.Lobby;
}

export default LobbyPlayerComponent;
