class Queue<T> {
	private capacity: number;
	private head: number;
	private tail: number;
	private count: number;
	private buffer: Array<T | undefined>;

	public constructor(initialCapacity: number = 100) {
		this.capacity = initialCapacity;
		this.head = 0;
		this.tail = 0;
		this.count = 0;
		this.buffer = new Array<T | undefined>(initialCapacity);
	}

	public size(): number {
		return this.count;
	}

	public isEmpty(): boolean {
		return this.count === 0;
	}

	public enqueue(value: T): void {
		if (this.count === this.capacity) this.resize();

		this.buffer[this.tail] = value;
		this.tail = (this.tail + 1) % this.capacity;
		this.count++;
	}

	public dequeue(): T | undefined {
		if (this.isEmpty()) {
			warn("Queue is empty");
			return;
		}

		const value = this.buffer[this.head];
		this.buffer[this.head] = undefined;
		this.head = (this.head + 1) % this.capacity;
		this.count--;

		return value;
	}

	public peek(): T | undefined {
		return this.buffer[this.head];
	}

	private resize(): void {
		const newCapacity = this.capacity * 2;
		const newBuffer = new Array<T | undefined>(newCapacity);

		for (let i = 0; i < this.count; i++) {
			newBuffer[i] = this.buffer[(this.head + i) % this.capacity];
		}

		this.capacity = newCapacity;
		this.head = 0;
		this.tail = this.count;
		this.buffer = newBuffer;
	}
}
export default Queue;
