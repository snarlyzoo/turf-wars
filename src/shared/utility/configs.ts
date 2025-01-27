import { SlingshotConfig } from "shared/types/toolTypes";

const DEFAULT_SLINGSHOT_CONFIG: SlingshotConfig = {
	drawSpeed: 35,

	projectile: {
		startSpeed: 25,
		maxSpeed: 100,

		gravity: 40,

		lifetime: 10,

		damage: {
			baseDamage: 50,
			speedMultiplier: 0.5,
		},
	},

	rateOfFire: 400,
};

export function getSlingshotConfig(configuration?: Configuration): SlingshotConfig {
	const config = DEFAULT_SLINGSHOT_CONFIG;
	if (!configuration) return config;

	const drawSpeed = configuration.FindFirstChild("DrawSpeed");
	if (drawSpeed && drawSpeed.IsA("NumberValue")) {
		config.drawSpeed = drawSpeed.Value;
	}

	const projectileConfiguration = configuration.FindFirstChild("Projectile");
	if (projectileConfiguration) {
		const startSpeed = projectileConfiguration.FindFirstChild("StartSpeed");
		if (startSpeed && startSpeed.IsA("NumberValue")) {
			config.projectile.startSpeed = startSpeed.Value;
		}
		const maxSpeed = projectileConfiguration.FindFirstChild("MaxSpeed");
		if (maxSpeed && maxSpeed.IsA("NumberValue")) {
			config.projectile.maxSpeed = maxSpeed.Value;
		}

		const gravity = projectileConfiguration.FindFirstChild("Gravity");
		if (gravity && gravity.IsA("NumberValue")) {
			config.projectile.gravity = gravity.Value;
		}

		const lifetime = projectileConfiguration.FindFirstChild("Lifetime");
		if (lifetime && lifetime.IsA("NumberValue")) {
			config.projectile.lifetime = lifetime.Value;
		}

		const damageConfiguration = configuration.FindFirstChild("Damage");
		if (damageConfiguration) {
			const baseDamage = damageConfiguration.FindFirstChild("BaseDamage");
			if (baseDamage && baseDamage.IsA("NumberValue")) {
				config.projectile.damage.baseDamage = baseDamage.Value;
			}
			const speedMultiplier = damageConfiguration.FindFirstChild("SpeedMultiplier");
			if (speedMultiplier && speedMultiplier.IsA("NumberValue")) {
				config.projectile.damage.speedMultiplier = speedMultiplier.Value;
			}
		}

		const pvInstance = projectileConfiguration.FindFirstChild("PVInstance");
		if (pvInstance && pvInstance.IsA("ObjectValue")) {
			const value = pvInstance.Value;
			if (value && value.IsA("PVInstance")) {
				config.projectile.pvInstance = value;
			}
		}
	}

	const rateOfFire = configuration.FindFirstChild("RateOfFire");
	if (rateOfFire && rateOfFire.IsA("NumberValue")) {
		config.rateOfFire = rateOfFire.Value;
	}

	return config;
}
