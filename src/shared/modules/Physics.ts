export abstract class Physics {
	public static calculatePosition(
		position: Vector3,
		velocity: Vector3,
		acceleration: Vector3,
		deltaTime: number,
	): Vector3 {
		return position.add(velocity.mul(deltaTime)).add(acceleration.mul(0.5 * deltaTime * deltaTime));
	}

	public static calculateVelocity(velocity: Vector3, acceleration: Vector3, deltaTime: number): Vector3 {
		return velocity.add(acceleration.mul(deltaTime));
	}
}
