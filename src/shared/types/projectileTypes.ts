export type Projectile = {
	position: Vector3;
	velocity: Vector3;
	acceleration: Vector3;

	raycastParams: RaycastParams;

	lifetime: number;
	startTick: number;
	lastTick: number;

	pvInstance?: PVInstance;

	timestamp?: number;

	onImpact?: BindableEvent;
};

export const enum ProjectileHitType {
	Block,
	Character,
}

export type ProjectileModifier = {
	speed?: number;
	gravity?: number;

	lifetime?: number;

	pvInstance?: PVInstance;
	color?: Color3;

	timestamp?: number;

	onImpact?: BindableEvent;
};

export type ProjectileRecord = {
	origin: Vector3;
	direction: Vector3;
	speed: number;
	config: ProjectileConfig;
};

export type ProjectileConfig = {
	startSpeed: number;
	maxSpeed: number;

	gravity: number;

	lifetime: number;

	damage: {
		baseDamage: number;
		speedMultiplier: number;
	};

	pvInstance?: PVInstance;
};
