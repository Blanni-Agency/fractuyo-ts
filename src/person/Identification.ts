import { DocumentType } from '../types'

class Identification {
	#number = ''
	#type: DocumentType = DocumentType.OTROS

	constructor(type: DocumentType, number: string) {
		this.setIdentity(type, number)
	}

	setIdentity(type: DocumentType, number: string) {
		if (Identification.validateDocumentNumber(type, number)) {
			this.#number = number
			this.#type = type
			return this
		}
		throw new Error('Número de identificación de persona inconsistente.')
	}

	getNumber() {
		return this.#number
	}

	getType() {
		return this.#type
	}

	static validateDocumentNumber(documentType: DocumentType, number: string) {
		switch(documentType) {
			case DocumentType.OTROS:
				return true
			case DocumentType.DNI://DNI o libreta electoral
				//longitud: 8: exacta
				//caracter: numérico
				return (number != null && number.length === 8 && !isNaN(Number(number)))
			case DocumentType.CARNET_EXTRANJERIA:
				//longitud: 12: máxima
				//caracter: alfanumérico
				return (number != null && number.length < 13)
			case DocumentType.RUC:
				return Identification.validateRuc(number)
			default:
				return false
		}
	}

	static validateRuc(ruc: string) {
		if (ruc.length != 11 || parseInt(ruc) < 11) {
			return false
		}
		if (!['10', '15', '17', '20'].includes(ruc.substring(0, 2))) {
			return false
		}

		// Taken from https://www.excelnegocios.com/validacion-de-rucs-sunat-peru-sin-internet-algoritmo/
		const maxFactor = 8
		let currentFactor = 1
		let sum = 0
		for (let i = 9; i >= 0; --i) {
			if (++currentFactor == maxFactor) {
				currentFactor = 2
			}

			sum += currentFactor * parseInt(ruc.charAt(i))
		}

		if ((11 - (sum % 11)) % 10 == parseInt(ruc.charAt(10))) {
			return true
		}

		return false
	}
}

export default Identification
