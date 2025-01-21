export interface Projectile {
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
}

export interface ProjectileModifier {
	speed?: number;
	gravity?: number;

	lifetime?: number;

	pvInstance?: PVInstance;
	color?: Color3;

	timestamp?: number;

	onImpact?: BindableEvent;
}
