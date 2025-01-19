/**
 * When items arrive in import.
 */
class Port {
	#type = false; // true: port, false: airport
	#identity = ''; // code (3 letters)
	#name = '';

	constructor(type: boolean, identity: string) {
		this.#type = type;
		this.setIdentity(identity);
	}

	get type() {
		return this.#type;
	}

	setIdentity(identity: string) {
		this.#identity = identity;
	}

	get identity() {
		return this.#identity;
	}

	setName(name: string) {
		this.#name = name;
	}

	get name() {
		return this.#name;
	}
}

export default Port;
