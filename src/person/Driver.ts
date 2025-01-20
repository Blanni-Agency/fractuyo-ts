import Person from './Person.js'

class Driver extends Person {
	#license = ''

	#familyName = '' // surname

	constructor(license: string) {
		super()
		this.setLicense(license)
	}

	setLicense(license: string) {
		this.#license = license
	}

	getLicense() {
		return this.#license
	}

	setFamilyName(name: string) {
		this.#familyName = name
	}

	getFamilyName() {
		return this.#familyName
	}
}

export default Driver
