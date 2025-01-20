import Item from './Item'
import Receipt from './Receipt'
import Share from './Share'
import Sale from './Sale'
import NodesGenerator from './xml/NodesGenerator'
import Charge from './Charge'
import Taxpayer from '../person/Taxpayer'
import Person from '../person/Person'

class Invoice extends Sale {
	#orderReference: string | null = null
	#orderReferenceText: string | null = null
	#dueDate: Date | null = null
	#shares: Share[] = []
	#sharesAmount = 0
	#detractionPercentage = 0
	#detractionAmount = 0
	#discount: Charge | null = null

	constructor(taxpayer: Taxpayer, customer: Person) {
		super(taxpayer, customer, 'Invoice')
	}

	setDetractionPercentage(dp: number) {
		if(dp >= 0 && dp <= 100) {
			this.#detractionPercentage = dp
			return
		}
		this.#detractionPercentage = 0
		throw new Error('Porcentaje de detracción inconsistente.')
	}

	getDetractionPercentage() {
		return this.#detractionPercentage
	}

	getDetractionAmount(withFormat = false) {
		return withFormat ? this.#detractionAmount.toFixed(2) : this.#detractionAmount
	}

	getShares() {
		return this.#shares
	}

	addShare(share: Share) {
		this.#shares.push(share)
		this.#sharesAmount += share.getAmount()
	}

	recalcSharesAmount() {
		this.#sharesAmount = 0
		for (const share of this.#shares) {
			this.#sharesAmount += share.getAmount()
		}
	}

	getSharesAmount() {
		return this.#sharesAmount
	}

	/**
	 * Recreate shares array without a share.
	 * @param index in array.
	 */
	removeShare(index: number) {
		this.#shares = [...this.#shares.slice(0, index), ...this.#shares.slice(index + 1)]
	}

	getDueDate() {
		return this.#dueDate
	}

	setDueDate(dd: Date) {
		if (dd instanceof Date) {
			this.#dueDate = dd
		} else {
			this.#dueDate = null
		}
	}

	setOrderReference(reference: string) {
		if(reference.length > 0) {
			if(/\s/g.test(reference)) {
				throw new Error('La referencia numérica no debe contener espacios.')
			}
			if(reference.length > 20) {
				throw new Error('La referencia numérica no debe tener 20 caracteres como máximo.')
			}
			this.#orderReference = reference
		}
	}

	/**
	 * Empty reference identity and its description.
	 */
	clearOrderReference() {
		this.#orderReference = null
		this.#orderReferenceText = null
	}

	clearOrderReferenceText() {
		this.#orderReferenceText = null
	}

	getOrderReference() {
		return this.#orderReference
	}

	setOrderReferenceText(referenceText: string) {
		if(!this.#orderReference) {
			throw new Error('Asignar previamente la identidad de referencia.')
		}
		if(referenceText.length > 0) {
			this.#orderReferenceText = referenceText
		}
	}

	getOrderReferenceText() {
		return this.#orderReferenceText
	}

	setDiscount(discountAmount: number) {
		if(discountAmount > 0) {
			this.#discount = new Charge(false)
			this.#discount.setTypeCode('02')
			this.#discount.setFactor(discountAmount / this.taxInclusiveAmount, this.lineExtensionAmount)

			//Recalc amounts
			const factorInverse = 1 - this.#discount.factor
			this.igvAmount = this.igvAmount * factorInverse
			this.iscAmount = this.iscAmount * factorInverse
			this.taxTotalAmount = this.taxTotalAmount * factorInverse
			this.taxInclusiveAmount = this.taxInclusiveAmount * factorInverse
			this.setOperationAmount(0, this.getOperationAmount(0) * factorInverse)
			this.setOperationAmount(1, this.getOperationAmount(1) * factorInverse)
			this.setOperationAmount(2, this.getOperationAmount(2) * factorInverse)
			this.setOperationAmount(3, this.getOperationAmount(3) * factorInverse)
		}
	}

	getDiscount() {
		return this.#discount
	}

	calcDetractionAmount() {
		if (this.#detractionPercentage > 0) {
			if (this.taxInclusiveAmount > 700) {
				this.#detractionAmount = this.taxInclusiveAmount * this.#detractionPercentage / 100
				return // exit this function successfully
			}
			this.#detractionAmount = 0.0 // to overwrite when amount decrements
		} else {
			this.#detractionAmount = 0.0
		}
	}

	/**
	 * Performs substraction taxInclusiveAmount with detractionAmount.
	 */
	getShareableAmount(withFormat = false) {
		const shareableAmount = this.taxInclusiveAmount - this.#detractionAmount
		return withFormat ? shareableAmount.toFixed(2) : shareableAmount
	}

	/**
	 * Check if everything can be processed.
	 * It does some calculations
	 */
	validate(validateNumeration: boolean) {
		super.validate(validateNumeration)

		switch(Number(this.getTypeCode())) {
			case 1: // for "factura"
				if(Number(this.getCustomer().getIdentification()?.getType()) !== 6) {
					throw new Error('El cliente debe tener RUC.')
				}
		}

		if(this.#sharesAmount) {
			if(this.#detractionAmount) {
				const sharesAmountFixed = Number(this.#sharesAmount.toFixed(2))
				const detractionDiffFixed = Number((this.taxInclusiveAmount - this.#detractionAmount).toFixed(2))
				if(sharesAmountFixed !== detractionDiffFixed) {
					throw new Error('La suma de las cuotas difiere del total menos detracción.')
				}
			}
			else if(Number(this.#sharesAmount.toFixed(2)) !== Number(this.taxInclusiveAmount.toFixed(2))) {
				throw new Error('La suma de las cuotas difiere del total.')
			}
		}
	}

	toXml() {
		this.createXmlWrapper()
		NodesGenerator.generateHeader(this)
		NodesGenerator.generateIdentity(this)
		NodesGenerator.generateDates(this)
		NodesGenerator.generateTypeCode(this)
		NodesGenerator.generateNotes(this)
		NodesGenerator.generateCurrencyCode(this)
		NodesGenerator.generateReference(this)
		NodesGenerator.generateSignature(this)
		NodesGenerator.generateSupplier(this)
		NodesGenerator.generateCustomer(this)
		NodesGenerator.generatePaymentMeans(this)
		NodesGenerator.generatePaymentTerms(this)
		NodesGenerator.generateCharge(this)
		NodesGenerator.generateTaxes(this)
		NodesGenerator.generateTotal(this)
		NodesGenerator.generateLines(this)
	}

	/**
	 * @return xmlDoc parsed
	 */
	fromXml(xmlContent: string) {
		// All about sale
		const xmlDoc = super.fromXml(xmlContent)

		const orderReference = xmlDoc.getElementsByTagNameNS(Receipt.namespaces.cac, 'OrderReference')[0]
		if (orderReference) {
			const orderReferenceId = orderReference.getElementsByTagNameNS(Receipt.namespaces.cbc, 'ID')[0]?.textContent
			if (orderReferenceId) {
				this.setOrderReference(orderReferenceId)
				const orderReferenceText = orderReference.getElementsByTagNameNS(Receipt.namespaces.cbc, 'CustomerReference')[0]?.textContent
				if (orderReferenceText) {
					this.setOrderReferenceText(orderReferenceText)
				}
			}
		}

		// All items. Always present.
		const items = xmlDoc.getElementsByTagNameNS(Receipt.namespaces.cac, 'InvoiceLine')
		for (let i = 0; i < items.length; i++) {
			const item = new Item(items[i].getElementsByTagNameNS(Receipt.namespaces.cbc, 'Description')[0]?.textContent || '')
			item.setQuantity(items[i].getElementsByTagNameNS(Receipt.namespaces.cbc, 'InvoicedQuantity')[0]?.textContent || '')
			item.setUnitValue(
				items[i].getElementsByTagNameNS(Receipt.namespaces.cac, 'Price')[0]?.getElementsByTagNameNS(Receipt.namespaces.cbc, 'PriceAmount')[0]?.textContent || '',
				false
			)
			item.setUnitCode(items[i].getElementsByTagNameNS(Receipt.namespaces.cbc, 'InvoicedQuantity')[0]?.getAttribute('unitCode') || '')

			// Warning because there are many tags with same name
			item.setIgvPercentage(parseInt(items[i].getElementsByTagNameNS(Receipt.namespaces.cbc, 'Percent')[0]?.textContent || '0'))
			item.setExemptionReasonCode(parseInt(items[i].getElementsByTagNameNS(Receipt.namespaces.cbc, 'TaxExemptionReasonCode')[0]?.textContent || '0'))

			item.calcMounts()
			this.addItem(item)
		}

		// about detractions
		// possible deduction
		const paymentMean = xmlDoc.getElementsByTagNameNS(Receipt.namespaces.cac, 'PaymentMeans')[0]
		if (paymentMean) { // exists deduction
			const id = paymentMean.getElementsByTagNameNS(Receipt.namespaces.cbc, 'ID')[0]?.textContent
			if (id == 'Detraccion') { // deduction exists
				// look for more about this deduction
				const paymentTerms = xmlDoc.getElementsByTagNameNS(Receipt.namespaces.cac, 'PaymentTerms')
				for (const paymentTerm of paymentTerms) {
					if (paymentTerm.getElementsByTagNameNS(Receipt.namespaces.cbc, 'ID')[0]?.textContent != 'Detraccion') {
						continue
					}

					// we found it
					this.setDetractionPercentage(parseInt(paymentTerm.getElementsByTagNameNS(Receipt.namespaces.cbc, 'PaymentPercent')[0]?.textContent || '0'))
					this.calcDetractionAmount()
					break // then nothing else
				}
			}
		}

		// check if there are shares
		const paymentTerms = xmlDoc.getElementsByTagNameNS(Receipt.namespaces.cac, 'PaymentTerms')
		for (let i = 0; i < paymentTerms.length; ++i) {
			if (paymentTerms[i].getElementsByTagNameNS(Receipt.namespaces.cbc, 'ID')[0]?.textContent == 'FormaPago') {
				// If there is Credito means that next siblings are amounts
				if (paymentTerms[i].getElementsByTagNameNS(Receipt.namespaces.cbc, 'PaymentMeansID')[0]?.textContent == 'Credito') {
					++i // set index to next sibling
					// iterate posible remaining shares
					for (; i < paymentTerms.length; ++i) {
						// if FormaPago is not found, means we don't have any share
						if (paymentTerms[i].getElementsByTagNameNS(Receipt.namespaces.cbc, 'ID')[0]?.textContent != 'FormaPago') {
							break
						}
						const share = new Share()
						// capture date and amount
						share.setAmount(paymentTerms[i].getElementsByTagNameNS(Receipt.namespaces.cbc, 'Amount')[0]?.textContent || '0')
						const dateParts = (paymentTerms[i].getElementsByTagNameNS(Receipt.namespaces.cbc, 'PaymentDueDate')[0]?.textContent || '').split('-')
						if (dateParts.length === 3) {
							share.setDueDate(new Date(Number(dateParts[0]), Number(dateParts[1]) - 1, Number(dateParts[2])))
						}
						this.addShare(share)
					}
				}
			}
		}

		return xmlDoc
	}
}

export default Invoice
