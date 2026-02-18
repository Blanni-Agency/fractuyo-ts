import Receipt from './Receipt'
import Item from './Item'
import Taxpayer from '../person/Taxpayer'
import Person from '../person/Person'
import Identification from '../person/Identification'
import Address from '../person/Address'

class Sale extends Receipt {
	#currencyId: string | null = null

	/*
	 * Global totals
	 */
	#lineExtensionAmount = 0
	#taxTotalAmount = 0
	#taxInclusiveAmount = 0
	#igvAmount = 0
	#iscAmount = 0
	#icbpAmount = 0
	#operationAmounts = [ 0, 0, 0, 0 ]

	constructor(taxpayer: Taxpayer, customer: Person, name: string) {
		super(taxpayer, customer, name)
	}

	get lineExtensionAmount() {
		return this.#lineExtensionAmount
	}

	get taxTotalAmount() {
		return this.#taxTotalAmount
	}

	set taxTotalAmount(amount: number) {
		this.#taxTotalAmount = amount
	}

	get taxInclusiveAmount() {
		return this.#taxInclusiveAmount
	}

	set taxInclusiveAmount(amount: number) {
		this.#taxInclusiveAmount = amount
	}

	get igvAmount() {
		return this.#igvAmount
	}

	set igvAmount(amount: number) {
		this.#igvAmount = amount
	}

	get iscAmount() {
		return this.#iscAmount
	}

	set iscAmount(amount: number) {
		this.#iscAmount = amount
	}

	get icbpAmount() {
		return this.#icbpAmount
	}

	set icbpAmount(amount: number) {
		this.#icbpAmount = amount
	}

	getOperationAmount(index: number) {
		return this.#operationAmounts[index]
	}

	setOperationAmount(index: number, amount: number) {
		this.#operationAmounts[index] = amount
	}

	setCurrencyId(cid: string) {
		this.#currencyId = cid
	}

	getCurrencyId() {
		return this.#currencyId
	}

	addItem(item: Item, withoutCalculation = false) {
		super.addItem(item)

		// Avoid calculation over this header (útil en fromXml)
		if (withoutCalculation) {
			return
		}

		this.#lineExtensionAmount += Number(item.getLineExtensionAmount())
		this.#taxTotalAmount += Number(item.getTaxTotalAmount())
		this.#taxInclusiveAmount += Number(item.getLineExtensionAmount()) + Number(item.getTaxTotalAmount())

		this.#igvAmount += Number(item.getIgvAmount())

		//Assign data according taxability
		switch (true) {
			case (item.getExemptionReasonCode() < 20):
				this.#operationAmounts[0] += Number(item.getLineExtensionAmount());break
			case (item.getExemptionReasonCode() < 30):
				this.#operationAmounts[1] += Number(item.getLineExtensionAmount());break
			case (item.getExemptionReasonCode() < 40):
				this.#operationAmounts[2] += Number(item.getLineExtensionAmount());break
			default:
				this.#operationAmounts[3] += Number(item.getLineExtensionAmount())
		}
	}

	/**
	 * Use it if maybe you are have edited an item or removed.
	 */
	recalcMounts() {
		// Cleaning values
		this.#lineExtensionAmount = this.#taxTotalAmount = this.#taxInclusiveAmount = this.#igvAmount = 0
		this.#operationAmounts[0] = this.#operationAmounts[1] = this.#operationAmounts[2] = this.#operationAmounts[3] = 0

		for (const item of this.items) {
			this.#lineExtensionAmount += Number(item.getLineExtensionAmount())
			this.#taxTotalAmount += Number(item.getTaxTotalAmount())
			this.#taxInclusiveAmount += Number(item.getLineExtensionAmount()) + Number(item.getTaxTotalAmount())

			this.#igvAmount += Number(item.getIgvAmount())

			//Assign data according taxability
			switch (true) {
				case (item.getExemptionReasonCode() < 20):
					this.#operationAmounts[0] += Number(item.getLineExtensionAmount());break
				case (item.getExemptionReasonCode() < 30):
					this.#operationAmounts[1] += Number(item.getLineExtensionAmount());break
				case (item.getExemptionReasonCode() < 40):
					this.#operationAmounts[2] += Number(item.getLineExtensionAmount());break
				default:
					this.#operationAmounts[3] += Number(item.getLineExtensionAmount())
			}
		}
	}

	getQrData() {
		const taxpayer = this.getTaxpayer()
		const customer = this.getCustomer()
		const issueDate = this.getIssueDate()

		if(!taxpayer || !customer || !issueDate) {
			throw new Error('Faltan datos requeridos para generar QR')
		}

		const identification = taxpayer.getIdentification()
		const customerIdentification = customer.getIdentification()

		if(!identification || !customerIdentification) {
			throw new Error('Faltan datos de identificación para generar QR')
		}

		return identification.getNumber()
			+ '|' + this.getId(true).replaceAll('-', '|')
			+ '|' + this.igvAmount.toFixed(2)
			+ '|' + this.taxInclusiveAmount.toFixed(2)
			+ '|' + issueDate.toISOString().substr(0, 10)
			+ '|' + customerIdentification.getType()
			+ '|' + customerIdentification.getNumber()
	}

	validate(validateNumeration: boolean) {
		super.validate(validateNumeration)

		if(this.items.length == 0) {
			throw new Error('No hay ítems en esta venta.')
		}

		if(!this.#currencyId || this.#currencyId.length != 3) { // length according ISO
			throw new Error('Moneda no establecida.')
		}

		// Check item attributes
		let c = 0
		for (const item of this.items) {
			c++ // simple counter
			if(!item.getQuantity() || Number(item.getQuantity()) <= 0) {
				throw new Error(`Ítem ${c} tiene cantidad errónea.`)
			}
			if(!item.getUnitCode() || item.getUnitCode().length == 0) {
				throw new Error(`Ítem ${c} sin unidad de medida.`)
			}
			if(!item.getLineExtensionAmount() || Number(item.getLineExtensionAmount()) <= 0) {
				throw new Error(`Ítem ${c} tiene valor de venta erróneo.`)
			}
			if(!item.getPricingReferenceAmount() || Number(item.getPricingReferenceAmount()) <= 0) {
				throw new Error(`Ítem ${c} tiene precio de venta unitario erróneo.`)
			}
			if(!item.getDescription() || item.getDescription().length == 0) {
				throw new Error(`Ítem ${c} no tiene descripción.`)
			}
		}
	}

	/**
	 * Parse xml string for filling attributes.
	 * If printed taxpayer is different from system current taxpayer then throw error.
	 * @
		// Parsing de impuestos (IGV, EXO, ISC, ICBPER)
		{
			const taxTotal = xmlDoc.getElementsByTagNameNS(Receipt.namespaces.cac, 'TaxTotal')[0]
			if (taxTotal) {
				const taxSubtotals = taxTotal.getElementsByTagNameNS(Receipt.namespaces.cac, 'TaxSubtotal')

				for (const taxSubtotal of taxSubtotals) {
					const taxCategory = taxSubtotal.getElementsByTagNameNS(Receipt.namespaces.cac, 'TaxCategory')[0]
					if (!taxCategory) continue

					const taxScheme = taxCategory.getElementsByTagNameNS(Receipt.namespaces.cac, 'TaxScheme')[0]
					if (!taxScheme) continue

					const taxName = taxScheme.getElementsByTagNameNS(Receipt.namespaces.cbc, 'Name')[0]?.textContent
					const taxAmountEl = taxSubtotal.getElementsByTagNameNS(Receipt.namespaces.cbc, 'TaxAmount')[0]
					const taxableAmountEl = taxSubtotal.getElementsByTagNameNS(Receipt.namespaces.cbc, 'TaxableAmount')[0]

					if (!taxName) continue

					const taxAmount = parseFloat(taxAmountEl?.textContent || '0')
					const taxableAmount = parseFloat(taxableAmountEl?.textContent || '0')

					switch (taxName) {
						case 'IGV':
							// Operaciones gravadas
							this.igvAmount = taxAmount
							this.setOperationAmount(0, taxableAmount)
							break

						case 'EXO':
							// Operaciones exoneradas
							this.setOperationAmount(1, taxableAmount)
							break

						case 'INA':
							// Operaciones inafectas
							this.setOperationAmount(2, taxableAmount)
							break

						case 'ISC':
							// Impuesto Selectivo al Consumo
							this.iscAmount = taxAmount
							break

						case 'ICBPER':
							// Impuesto a las Bolsas Plásticas
							this.icbpAmount = taxAmount
							break

						case 'OTROS':
							// Otros cargos
							this.setOperationAmount(3, taxableAmount)
							break
					}
				}
			}
		}

		return xmlDoc from parsed document.
	 */
	fromXml(xmlContent: string) {
		const xmlDoc = super.fromXml(xmlContent)

		const typeCode = xmlDoc.getElementsByTagNameNS(Receipt.namespaces.cbc, `${this.name}TypeCode`)[0]?.textContent || ''
		this.setTypeCode(typeCode)

		const currencyId = xmlDoc.getElementsByTagNameNS(Receipt.namespaces.cbc, 'DocumentCurrencyCode')[0]?.textContent || ''
		this.setCurrencyId(currencyId)

		const issueDate = xmlDoc.getElementsByTagNameNS(Receipt.namespaces.cbc, 'IssueDate')[0]?.textContent || ''
		const dateParts = issueDate.split('-') // split in year, month and day
		this.setIssueDate(new Date(Number(dateParts[0]), Number(dateParts[1]) - 1, Number(dateParts[2])))

		{
			const taxpayer = new Taxpayer()
			const accountingSupplierParty = xmlDoc.getElementsByTagNameNS(Receipt.namespaces.cac, 'AccountingSupplierParty')[0]
			const id = accountingSupplierParty.getElementsByTagNameNS(Receipt.namespaces.cbc, 'ID')[0]?.textContent || ''
			const type = accountingSupplierParty.getElementsByTagNameNS(Receipt.namespaces.cbc, 'ID')[0]?.getAttribute('schemeID') || ''
			taxpayer.setIdentification(new Identification(parseInt(type, 16), id))

			const tradeName = accountingSupplierParty.getElementsByTagNameNS(Receipt.namespaces.cbc, 'Name')[0]?.textContent || ''
			taxpayer.setTradeName(tradeName)

			const name = accountingSupplierParty.getElementsByTagNameNS(Receipt.namespaces.cbc, 'RegistrationName')[0]?.textContent || ''
			taxpayer.setName(name)

			{
				const registrationAddress = accountingSupplierParty.getElementsByTagNameNS(Receipt.namespaces.cac, 'RegistrationAddress')[0]

				const address = new Address()
				address.ubigeo = registrationAddress.getElementsByTagNameNS(Receipt.namespaces.cbc, 'ID')[0]?.textContent || ''
				address.city = registrationAddress.getElementsByTagNameNS(Receipt.namespaces.cbc, 'CityName')[0]?.textContent || ''
				address.district = registrationAddress.getElementsByTagNameNS(Receipt.namespaces.cbc, 'District')[0]?.textContent || ''
				address.subentity = registrationAddress.getElementsByTagNameNS(Receipt.namespaces.cbc, 'Subentity')[0]?.textContent || ''
				address.line = registrationAddress.getElementsByTagNameNS(Receipt.namespaces.cbc, 'Line')[0]?.textContent || ''

				taxpayer.setAddress(address)
			}

			{ // contact info
				const web = accountingSupplierParty.getElementsByTagNameNS(Receipt.namespaces.cbc, 'Note')[0]?.textContent || ''
				const email = accountingSupplierParty.getElementsByTagNameNS(Receipt.namespaces.cbc, 'ElectronicMail')[0]?.textContent || ''
				const telephone = accountingSupplierParty.getElementsByTagNameNS(Receipt.namespaces.cbc, 'Telephone')[0]?.textContent || ''

				taxpayer.setWeb(web)
				taxpayer.setEmail(email)
				taxpayer.setTelephone(telephone)
			}

			this.setTaxpayer(taxpayer)
		}

		{
			const customer = new Person()
			const accountingCustomerParty = xmlDoc.getElementsByTagNameNS(Receipt.namespaces.cac, 'AccountingCustomerParty')[0]
			const id = accountingCustomerParty.getElementsByTagNameNS(Receipt.namespaces.cbc, 'ID')[0]?.textContent || ''
			const type = accountingCustomerParty.getElementsByTagNameNS(Receipt.namespaces.cbc, 'ID')[0]?.getAttribute('schemeID') || ''
			customer.setIdentification(new Identification(parseInt(type, 16), id))
			customer.setName(accountingCustomerParty.getElementsByTagNameNS(Receipt.namespaces.cbc, 'RegistrationName')[0]?.textContent || '-')

			// customer address
			{
				const registrationAddress = accountingCustomerParty.getElementsByTagNameNS(Receipt.namespaces.cac, 'RegistrationAddress')[0]

				if(registrationAddress) {
					const address = new Address()
					address.line = registrationAddress.getElementsByTagNameNS(Receipt.namespaces.cbc, 'Line')[0]?.textContent || ''

					customer.setAddress(address)
				}
			}

			this.setCustomer(customer)
		}

		
		// Parsing de impuestos (IGV, EXO, ISC, ICBPER)
		{
			const taxTotal = xmlDoc.getElementsByTagNameNS(Receipt.namespaces.cac, 'TaxTotal')[0]
			if (taxTotal) {
				const taxSubtotals = taxTotal.getElementsByTagNameNS(Receipt.namespaces.cac, 'TaxSubtotal')

				for (const taxSubtotal of taxSubtotals) {
					const taxCategory = taxSubtotal.getElementsByTagNameNS(Receipt.namespaces.cac, 'TaxCategory')[0]
					if (!taxCategory) continue

					const taxScheme = taxCategory.getElementsByTagNameNS(Receipt.namespaces.cac, 'TaxScheme')[0]
					if (!taxScheme) continue

					const taxName = taxScheme.getElementsByTagNameNS(Receipt.namespaces.cbc, 'Name')[0]?.textContent
					const taxAmountEl = taxSubtotal.getElementsByTagNameNS(Receipt.namespaces.cbc, 'TaxAmount')[0]
					const taxableAmountEl = taxSubtotal.getElementsByTagNameNS(Receipt.namespaces.cbc, 'TaxableAmount')[0]

					if (!taxName) continue

					const taxAmount = parseFloat(taxAmountEl?.textContent || '0')
					const taxableAmount = parseFloat(taxableAmountEl?.textContent || '0')

					switch (taxName) {
						case 'IGV':
							// Operaciones gravadas
							this.igvAmount = taxAmount
							this.setOperationAmount(0, taxableAmount)
							break

						case 'EXO':
							// Operaciones exoneradas
							this.setOperationAmount(1, taxableAmount)
							break

						case 'INA':
							// Operaciones inafectas
							this.setOperationAmount(2, taxableAmount)
							break

						case 'ISC':
							// Impuesto Selectivo al Consumo
							this.iscAmount = taxAmount
							break

						case 'ICBPER':
							// Impuesto a las Bolsas Plásticas
							this.icbpAmount = taxAmount
							break

						case 'OTROS':
							// Otros cargos
							this.setOperationAmount(3, taxableAmount)
							break
					}
				}
			}
		}

		return xmlDoc
	}
}

export default Sale
