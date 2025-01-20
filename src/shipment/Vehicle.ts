class Vehicle {
	#identity = '' // registration, placa, matrícula
	#registrationIdentity = '' // circulation number card
	#authorization = '' // authorization number
	#departmentCode = '' // state entity, agency

	constructor(identity: string) {
		this.setIdentity(identity)
	}

	setIdentity(identity: string) {
		this.#identity = identity
	}

	get identity() {
		return this.#identity
	}

	setRegistrationIdentity(identity: string) {
		this.#registrationIdentity = identity
	}

	get registrationIdentity() {
		return this.#registrationIdentity
	}

	setAuthorization(authorization: string) {
		this.#authorization = authorization
	}

	get authorization() {
		return this.#authorization
	}

	setDepartmentCode(code: string) {
		this.#departmentCode = code
	}

	get departmentCode() {
		return this.#departmentCode
	}
}

export default Vehicle
