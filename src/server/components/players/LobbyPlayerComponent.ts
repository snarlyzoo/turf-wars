import { Component } from "@flamework/components";
import { PlayerComponent } from "./PlayerComponent";
import { CharacterType } from "shared/types/characterTypes";

@Component()
export class LobbyPlayerComponent extends PlayerComponent {
	public override characterType = CharacterType.Lobby;
}
