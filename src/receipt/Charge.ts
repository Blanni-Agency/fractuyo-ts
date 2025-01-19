class Charge {
	#indicator: boolean
	#amount = 0
	#typeCode: string = ""
	#factor = 0

	/**
	 * Original amount.
	 * Line extension amount.
	 */
	#baseAmount = 0

	constructor(isCharge: boolean) {
		this.#indicator = isCharge
	}

	get indicator() {
		return this.#indicator
	}

	setAmount(amount: number) {
		this.#amount = amount
	}

	get amount() {
		return this.#amount
	}

	setTypeCode(typeCode: string) {
		this.#typeCode = typeCode
	}

		getTypeCode() {
		return this.#typeCode
	}

	setFactor(factor: number, baseAmount: number) {
		this.#factor = factor
		this.#amount = factor * baseAmount
		this.#baseAmount = baseAmount
	}

	get factor() {
		return this.#factor
	}

	get baseAmount() {
		return this.#baseAmount
	}
}

export default Charge;
