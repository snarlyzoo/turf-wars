import { Component } from "@flamework/components";
import { CharacterComponent } from "./CharacterComponent";

@Component()
export class LobbyCharacterComponent extends CharacterComponent {
	protected override CAMERA_MODE = Enum.CameraMode.Classic;
}
