class Share {
	#dueDate: Date = new Date()
	#amount = 0

	setDueDate(dd: Date) {
		this.#dueDate = dd
	}

	getDueDate() {
		return this.#dueDate
	}

	setAmount(a: string | number) {
		this.#amount = parseFloat(a.toString())
		if(isNaN(this.#amount)) {
			throw new Error('Cantidad de cuota no es un número.')
		}
		if(this.#amount <= 0) {
			throw new Error('Monto de cuota no puede ser 0.')
		}
	}

	getAmount() {
		return this.#amount
	}

	getAmountWithFormat() {
		return this.#amount.toFixed(2)
	}
}

export default Share
