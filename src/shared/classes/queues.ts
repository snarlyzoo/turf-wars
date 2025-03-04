export class Queue<T> {
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

export class PriorityQueue<T extends defined> {
	private heap: Array<T> = [];
	private compare: (a: T, b: T) => number;

	public constructor(compare: (a: T, b: T) => number) {
		this.compare = compare;
	}

	public size(): number {
		return this.heap.size();
	}

	public isEmpty(): boolean {
		return this.heap.isEmpty();
	}

	public enqueue(value: T): void {
		this.heap.push(value);
		this.bubbleUp();
	}

	public dequeue(): T | undefined {
		if (this.isEmpty()) {
			warn("Priority queue is empty");
			return;
		}

		const first = this.heap[0];
		const last = this.heap.pop()!;
		if (!this.isEmpty()) {
			this.heap[0] = last;
			this.bubbleDown();
		}
		return first;
	}

	public peek(): T | undefined {
		return this.heap[0];
	}

	private bubbleUp(): void {
		let index = this.heap.size() - 1;
		const value = this.heap[index];
		while (index > 0) {
			const parentIndex = math.floor((index - 1) / 2);
			const parent = this.heap[parentIndex];

			if (this.compare(value, parent) >= 0) break;

			this.heap[index] = parent;
			index = parentIndex;
		}
		this.heap[index] = value;
	}

	private bubbleDown(): void {
		const length = this.heap.size();
		const value = this.heap[0];

		let index = 0;
		while (index < length) {
			const leftChildIndex = 2 * index + 1;
			const rightChildIndex = 2 * index + 2;

			let smallest = index;
			if (leftChildIndex < length && this.compare(this.heap[leftChildIndex], this.heap[smallest]) < 0) {
				smallest = leftChildIndex;
			}
			if (rightChildIndex < length && this.compare(this.heap[rightChildIndex], this.heap[smallest]) < 0) {
				smallest = rightChildIndex;
			}

			if (smallest === index) break;

			this.heap[index] = this.heap[smallest];
			index = smallest;
		}
		this.heap[index] = value;
	}
}
