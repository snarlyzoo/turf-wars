import { Components } from "@flamework/components";
import { Controller, OnStart } from "@flamework/core";
import { TiltCharacterComponent } from "client/components/characters/addons";
import { Events } from "client/network";
import { ProjectileCaster } from "shared/modules";
import { HumanoidCharacterInstance } from "shared/types/characterTypes";
import { ProjectileModifier, ProjectileRecord } from "shared/types/projectileTypes";

@Controller()
class ReplicationManager implements OnStart {
	private tiltCharacterMap = new Map<HumanoidCharacterInstance, TiltCharacterComponent>();

	public constructor(private components: Components) {}

	public onStart(): void {
		Events.CharacterTiltChanged.connect((character, angle) => this.onCharacterTiltChanged(character, angle));

		Events.ProjectileFired.connect((caster, projectileRecord) => this.onProjectileFired(caster, projectileRecord));
	}

	private onCharacterTiltChanged(character: HumanoidCharacterInstance, angle?: number): void {
		let tiltCharacter = this.tiltCharacterMap.get(character);
		if (!tiltCharacter) {
			tiltCharacter = this.components.addComponent<TiltCharacterComponent>(character);
			this.tiltCharacterMap.set(character, tiltCharacter);

			character.Destroying.Connect(() => {
				this.components.removeComponent<TiltCharacterComponent>(character);
				this.tiltCharacterMap.delete(character);
			});
		}
		tiltCharacter.update(angle);
	}

	private onProjectileFired(caster: Player, projectileRecord: ProjectileRecord): void {
		const raycastParams = new RaycastParams();

		const character = caster.Character;
		if (character) {
			raycastParams.FilterDescendantsInstances = [character];
			raycastParams.FilterType = Enum.RaycastFilterType.Exclude;
		}

		const config = projectileRecord.config;
		const projectileModifier: ProjectileModifier = {
			speed: projectileRecord.speed,
			gravity: config.gravity,
			lifetime: config.lifetime,
			pvInstance: config.pvInstance,
			color: caster.TeamColor.Color,
		};
		ProjectileCaster.castProjectile(
			projectileRecord.origin,
			projectileRecord.direction,
			raycastParams,
			projectileModifier,
		);
	}
}
