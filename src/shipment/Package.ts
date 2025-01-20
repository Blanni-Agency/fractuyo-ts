/**
 * Used as container.
 */
class Package {
	#traceIdentity = '' // such as the EPC number used in RFID
	#returnable = false // indicator of return

	constructor(identity: string) {
		this.traceIdentity = identity
	}

	set traceIdentity(identity: string) {
		this.#traceIdentity = identity
	}

	get traceIdentity() {
		return this.#traceIdentity
	}

	setReturnable(returnable: boolean) {
		this.#returnable = returnable
	}

	isReturnable() {
		return this.#returnable
	}
}

export default Package
