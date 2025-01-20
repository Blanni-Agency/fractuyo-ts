import Item from './Item'
import Receipt from './Receipt'
import Sale from './Sale'
import NodesGenerator from './xml/NodesGenerator'
import Taxpayer from '../person/Taxpayer'
import Person from '../person/Person'

class Note extends Sale {
	#description = ''
	#responseCode = 0
	#documentReference = ''
	#documentReferenceTypeCode = 0

	/**
	 * @param isCredit must be boolean to choose between credit as true or false for debit.
	 */
	constructor(taxpayer: Taxpayer, customer: Person, isCredit?: boolean) {
		super(taxpayer, customer, '')
		if (isCredit !== undefined) {
			this.setName(isCredit ? 'CreditNote' : 'DebitNote')
			this.setTypeCode(isCredit ? '7' : '8')
		}
	}

	setTypeCode(code: string) {
		if (code === '7' || code === '8') {
			super.setTypeCode(code)
			this.setName(code === '7' ? 'CreditNote' : 'DebitNote')
		}
	}

	setDescription(description: string) {
		if (description.length > 250) {
			this.#description = description.substring(0, 249)
			return
		}

		this.#description = description
	}

	getDescription() {
		return this.#description
	}

	setResponseCode(code: number) {
		this.#responseCode = code
	}

	getResponseCode(withFormat = false) {
		if (withFormat) {
			return String(this.#responseCode).padStart(2, '0')
		}
		return this.#responseCode
	}

	setDocumentReference(reference: string) {
		this.#documentReference = reference
	}

	getDocumentReference() {
		return this.#documentReference
	}

	setDocumentReferenceTypeCode(code: number) {
		this.#documentReferenceTypeCode = code
	}

	getDocumentReferenceTypeCode(withFormat = false) {
		if (withFormat) {
			return String(this.#documentReferenceTypeCode).padStart(2, '0')
		}
		return this.#documentReferenceTypeCode
	}

	toXml() {
		this.createXmlWrapper()

		NodesGenerator.generateHeader(this)
		NodesGenerator.generateIdentity(this)
		NodesGenerator.generateDates(this)
		NodesGenerator.generateNotes(this)
		NodesGenerator.generateCurrencyCode(this)
		NodesGenerator.generateDiscrepancy(this)
		NodesGenerator.generateReference(this)
		NodesGenerator.generateSignature(this)
		NodesGenerator.generateSupplier(this)
		NodesGenerator.generateCustomer(this)
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

		// Now about note
		const [ lineNodeName, quantityNodeName ] = this.getTypeCode() === '7' ? [ 'CreditNoteLine', 'CreditedQuantity' ] : [ 'DebitNoteLine', 'DebitedQuantity' ]

		const items = xmlDoc.getElementsByTagNameNS(Receipt.namespaces.cac, lineNodeName)
		for (let i = 0; i < items.length; i++) {
			const item = new Item( items[i].getElementsByTagNameNS(Receipt.namespaces.cbc, 'Description')[0]?.textContent || '' )
			item.setQuantity( items[i].getElementsByTagNameNS(Receipt.namespaces.cbc, quantityNodeName)[0]?.textContent || '' )
			item.setUnitValue(
				items[i].getElementsByTagNameNS(Receipt.namespaces.cac, 'Price')[0]?.getElementsByTagNameNS(Receipt.namespaces.cbc, 'PriceAmount')[0]?.textContent || '',
				false
			)
			item.setUnitCode( items[i].getElementsByTagNameNS(Receipt.namespaces.cbc, quantityNodeName)[0]?.getAttribute('unitCode') || '' )

			// Warning because there are many tags with same name
			item.setIgvPercentage( parseInt(items[i].getElementsByTagNameNS(Receipt.namespaces.cbc, 'Percent')[0]?.textContent || '0') )
			item.setExemptionReasonCode( parseInt(items[i].getElementsByTagNameNS(Receipt.namespaces.cbc, 'TaxExemptionReasonCode')[0]?.textContent || '0') )

			item.calcMounts()
			this.addItem(item)
		}

		{// related document
			const billingReference = xmlDoc.getElementsByTagNameNS(Receipt.namespaces.cac, 'BillingReference')[0]
			this.setDocumentReference(billingReference.getElementsByTagNameNS(Receipt.namespaces.cbc, 'ID')[0]?.textContent || '')
			this.setDocumentReferenceTypeCode(parseInt(billingReference.getElementsByTagNameNS(Receipt.namespaces.cbc, 'DocumentTypeCode')[0]?.textContent || '0'))

			const discrepancyResponse = xmlDoc.getElementsByTagNameNS(Receipt.namespaces.cac, 'DiscrepancyResponse')[0]
			this.setResponseCode(parseInt(discrepancyResponse.getElementsByTagNameNS(Receipt.namespaces.cbc, 'ResponseCode')[0]?.textContent || '0'))
			this.setDescription(discrepancyResponse.getElementsByTagNameNS(Receipt.namespaces.cbc, 'Description')[0]?.textContent || '')
		}

		return xmlDoc
	}
}

export default Note
