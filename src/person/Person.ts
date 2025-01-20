import Address from './Address'
import Identification from './Identification'

class Person {
	#name = ''
	#address: Address | null = null
	#identification: Identification | null = null

	getName() {
		return this.#name
	}

	setName(name: string) {
		if(name.length > 0) {
			this.#name = name
		}
	}

	setIdentification(identification: Identification) {
		this.#identification = identification
	}

	getIdentification() {
		if (!this.#identification) {
			throw new Error('La persona no tiene una identificación asociada')
		}

		return this.#identification
	}

	setAddress(address: Address) {
		this.#address = address
	}

	getAddress() {
		return this.#address
	}
}

export default Person
