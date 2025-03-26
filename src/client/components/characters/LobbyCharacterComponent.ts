import { Component } from "@flamework/components";
import CharacterComponent from "./CharacterComponent";

@Component()
class LobbyCharacterComponent extends CharacterComponent {
	protected override CAMERA_MODE = Enum.CameraMode.Classic;
}

export default LobbyCharacterComponent;
