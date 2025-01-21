export function calculatePosition(
	position: Vector3,
	velocity: Vector3,
	acceleration: Vector3,
	deltaTime: number,
): Vector3 {
	return position.add(velocity.mul(deltaTime)).add(acceleration.mul(0.5 * deltaTime * deltaTime));
}

export function calculateVelocity(velocity: Vector3, acceleration: Vector3, deltaTime: number): Vector3 {
	return velocity.add(acceleration.mul(deltaTime));
}
