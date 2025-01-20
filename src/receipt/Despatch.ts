import Receipt from './Receipt'
import Item from './Item'
import Taxpayer from '../person/Taxpayer'
import Person from '../person/Person'
import Identification from '../person/Identification'
import Address from '../person/Address'
import Endpoint from '../webservice/Endpoint'
import Rest from '../webservice/Rest'
import NodesGenerator from './xml/NodesGenerator'
import Vehicle from '../shipment/Vehicle'
import Driver from '../person/Driver'
import Package from '../shipment/Package'
import Port from '../shipment/Port'

class Despatch extends Receipt {
	#note: string = '' // description

	#unitCode: string = '' // maybe kgm
	#weight: number = 0 // value of unit code

	#startDate: Date | null = null

	#deliveryAddress: Address | null = null
	#despatchAddress: Address | null = null

	#handlingCode: number = 0 // catalog 20

	#carrier: Person | null = null // transportist

	#inLightVehicle: boolean = false

	#vehicles: Vehicle[] = []

	#drivers: Driver[] = []

	// A 'package' is reserved word :(
	#packages: Package[] = []

	#port: Port | null = null

	#url: string = '' // Generated in Sunat

	constructor(taxpayer: Taxpayer, customer: Person) {
		super(taxpayer, customer, 'DespatchAdvice')
	}

	setNote(note: string) {
		if (note.length > 250) {
			this.#note = note.substring(0, 249)
			return
		}

		this.#note = note
	}

	getNote(): string {
		return this.#note
	}

	setUnitCode(code: string) {
		this.#unitCode = code
	}

	getUnitCode(): string {
		return this.#unitCode
	}

	setWeight(weight: number) {
		this.#weight = weight
	}

	getWeight(): number {
		return this.#weight
	}

	setStartDate(date?: Date) {
		this.#startDate = date || new Date()
	}

	getStartDate(): Date {
		return this.#startDate!
	}

	setDeliveryAddress(address: Address) {
		this.#deliveryAddress = address
	}

	getDeliveryAddress() {
		if (!this.#deliveryAddress) {
			throw new Error('No hay dirección de entrega definida')
		}
		return this.#deliveryAddress
	}

	setDespatchAddress(address: Address) {
		this.#despatchAddress = address
	}

	/**
	 * @param real in true to force getting what was set instead fiscal address.
	 */
	getDespatchAddress(real: boolean = false) {
		if (this.#despatchAddress || real) {
			return this.#despatchAddress || this.getTaxpayer().getAddress()!
		}

		return this.getTaxpayer().getAddress()!
	}

	setCarrier(carrier: Person) {
		this.#carrier = carrier
	}

	getCarrier(): Person {
		if (!this.#carrier) {
			throw new Error('El transportista no está definido')
		}
		return this.#carrier
	}

	inLightVehicle(): boolean {
		return this.#inLightVehicle
	}

	usingLightVehicle(using: boolean) {
		this.#inLightVehicle = using
	}

	setHandlingCode(code: number) {
		this.#handlingCode = code
	}

	getHandlingCode(withFormat: boolean = false): string | number {
		return withFormat ? String(this.#handlingCode).padStart(2, '0') : this.#handlingCode
	}

	addVehicle(vehicle: Vehicle) {
		this.#vehicles.push(vehicle)
	}

	getVehicles(): Vehicle[] {
		return this.#vehicles
	}

	addDriver(driver: Driver) {
		this.#drivers.push(driver)
	}

	getDrivers(): Driver[] {
		return this.#drivers
	}

	addPackage(p: Package) {
		this.#packages.push(p)
	}

	getPackages(): Package[] {
		return this.#packages
	}

	setPort(port: Port) {
		this.#port = port
	}

	setUrl(url: string) {
		this.#url = url
	}

	getPort() {
		return this.#port
	}

	toXml() {
		this.createXmlWrapper()

		NodesGenerator.generateHeader(this)

		NodesGenerator.generateIdentity(this)

		NodesGenerator.generateDates(this)

		NodesGenerator.generateTypeCode(this)

		NodesGenerator.generateNotes(this)

		NodesGenerator.generateSignature(this)

		NodesGenerator.generateSupplier(this)

		NodesGenerator.generateCustomer(this)

		NodesGenerator.generateShipment(this)

		NodesGenerator.generateLines(this)
	}

	getQrData() {
		return this.#url
	}

	validate(validateNumeration: boolean = true) {
		super.validate(validateNumeration)

		if (!(this.#startDate instanceof Date)) {
			throw new Error('No hay fecha de partida.')
		}

		if (!this.#weight || this.#weight <= 0) {
			throw new Error('No tiene peso correcto.')
		}

		if (!this.#unitCode || this.#unitCode.length == 0) {
			throw new Error('No tiene unidad de medida de peso.')
		}

		if (!this.#handlingCode) {
			throw new Error('No está definido el motivo.')
		}

		if (this.#deliveryAddress instanceof Address) {
			if (!this.#deliveryAddress.line || this.#deliveryAddress.line.length == 0) {
				throw new Error('No hay línea en dirección de destino.')
			}
			if (!this.#deliveryAddress.ubigeo || this.#deliveryAddress.ubigeo.length != 6) {
				throw new Error('No hay ubigeo en dirección de destino.')
			}
		}
		else {
			throw new Error('No hay dirección de destino.')
		}

		if (this.items.length == 0) {
			throw new Error('No hay ítems en este despacho.')
		}

		// Check item attributes
		let c = 0
		for (const item of this.items) {
			c++ // simple counter
			const quantity = item.getQuantity()
			if (typeof quantity === 'string') {
				if (!parseFloat(quantity) || parseFloat(quantity) <= 0) {
					throw new Error(`Ítem ${c} tiene cantidad errónea.`)
				}
			} else {
				if (!quantity || quantity <= 0) {
					throw new Error(`Ítem ${c} tiene cantidad errónea.`)
				}
			}
			if (!item.getUnitCode() || item.getUnitCode().length == 0) {
				throw new Error(`Ítem ${c} sin unidad de medida.`)
			}
			if (!item.getDescription() || item.getDescription().length == 0) {
				throw new Error(`Ítem ${c} no tiene descripción.`)
			}
		}
	}

	async declare(zipStream: string): Promise<any> {
		const jsonBody = await Rest.generateSend(this, zipStream)
		const responseText = await Endpoint.fetchSend(JSON.stringify(jsonBody), this)
		return responseText
	}

	async handleTicket(ticketNumber: string): Promise<any> {
		const responseText = await Endpoint.fetchStatus(ticketNumber)
		return responseText
	}

	fromXml(xmlContent: string) {
		const xmlDoc = super.fromXml(xmlContent)

		const typeCode = xmlDoc.getElementsByTagNameNS(Receipt.namespaces.cbc, `${this.name}TypeCode`)[0]?.textContent || ''
		this.setTypeCode(typeCode)

		// Find note as child. Not deeper level.
		const probableNote = xmlDoc.getElementsByTagNameNS(Receipt.namespaces.cbc, 'Note')[0]
		if (
			probableNote && // exists
			probableNote.parentNode?.localName === 'DespatchAdvice'
		) {
			this.#note = probableNote.textContent || ''
		}

		{
			const taxpayer = new Taxpayer()
			const accountingSupplierParty = xmlDoc.getElementsByTagNameNS(Receipt.namespaces.cac, 'DespatchSupplierParty')[0]
			const id = accountingSupplierParty.getElementsByTagNameNS(Receipt.namespaces.cbc, 'ID')[0]?.textContent || ''
			const type = accountingSupplierParty.getElementsByTagNameNS(Receipt.namespaces.cbc, 'ID')[0]?.getAttribute('schemeID') || ''
			taxpayer.setIdentification(new Identification(type, id))

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
				taxpayer.setWeb(accountingSupplierParty.getElementsByTagNameNS(Receipt.namespaces.cbc, 'Note')[0]?.textContent || '')
				taxpayer.setEmail(accountingSupplierParty.getElementsByTagNameNS(Receipt.namespaces.cbc, 'ElectronicMail')[0]?.textContent || '')
				taxpayer.setTelephone(accountingSupplierParty.getElementsByTagNameNS(Receipt.namespaces.cbc, 'Telephone')[0]?.textContent || '')
			}

			this.setTaxpayer(taxpayer)
		}

		{
			const customer = new Person()
			const accountingCustomerParty = xmlDoc.getElementsByTagNameNS(Receipt.namespaces.cac, 'DeliveryCustomerParty')[0]
			const id = accountingCustomerParty.getElementsByTagNameNS(Receipt.namespaces.cbc, 'ID')[0]?.textContent || ''
			const type = accountingCustomerParty.getElementsByTagNameNS(Receipt.namespaces.cbc, 'ID')[0]?.getAttribute('schemeID') || ''
			customer.setIdentification(new Identification(type, id))
			customer.setName(accountingCustomerParty.getElementsByTagNameNS(Receipt.namespaces.cbc, 'RegistrationName')[0]?.textContent || '-')

			// customer address
			{
				const registrationAddress = accountingCustomerParty.getElementsByTagNameNS(Receipt.namespaces.cac, 'RegistrationAddress')[0]

				if (registrationAddress) {
					const address = new Address()
					address.line = registrationAddress.getElementsByTagNameNS(Receipt.namespaces.cbc, 'Line')[0]?.textContent || ''

					customer.setAddress(address)
				}
			}

			this.setCustomer(customer)
		}

		const items = xmlDoc.getElementsByTagNameNS(Receipt.namespaces.cac, 'DespatchLine')
		for (let i = 0; i < items.length; i++) {
			const item = new Item( items[i].getElementsByTagNameNS(Receipt.namespaces.cbc, 'Description')[0]?.textContent || '' )
			item.setQuantity( items[i].getElementsByTagNameNS(Receipt.namespaces.cbc, 'DeliveredQuantity')[0]?.textContent || '' )
			item.setUnitCode( items[i].getElementsByTagNameNS(Receipt.namespaces.cbc, 'DeliveredQuantity')[0]?.getAttribute('unitCode') || '' )

			this.addItem(item)
		}

		{ // Shipment
			const shipment = xmlDoc.getElementsByTagNameNS(Receipt.namespaces.cac, 'Shipment')[0]
			const grossWeightMeasure = shipment.getElementsByTagNameNS(Receipt.namespaces.cbc, 'GrossWeightMeasure')[0]
			this.setWeight(parseFloat(grossWeightMeasure?.textContent || '0'))
			this.setUnitCode(grossWeightMeasure?.getAttribute('unitCode') || '')

			const startDate = shipment.getElementsByTagNameNS(Receipt.namespaces.cbc, 'StartDate')[0]?.textContent || ''
			const dateParts = startDate.split('-') // split in year, month and day
			this.setStartDate(new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2])))

			// look for if vehicle is M1 or L
			const specialInstruction = shipment.getElementsByTagNameNS(Receipt.namespaces.cbc, 'SpecialInstructions')[0]?.textContent
			if (specialInstruction == 'SUNAT_Envio_IndicadorTrasladoVehiculoM1L') {
				this.#inLightVehicle = true
			}

			// Handling code according catalog 20
			const handlingCode = shipment.getElementsByTagNameNS(Receipt.namespaces.cbc, 'HandlingCode')[0]?.textContent || '0'
			this.setHandlingCode(parseInt(handlingCode))

			const transportMode = shipment.getElementsByTagNameNS(Receipt.namespaces.cbc, 'TransportModeCode')[0]?.textContent
			// We will check more data about carrier if is public transport
			if (transportMode === '01') {
				const carrierParty = shipment.getElementsByTagNameNS(Receipt.namespaces.cac, 'CarrierParty')[0]

				const carrier = new Person()
				carrier.setName(carrierParty.getElementsByTagNameNS(Receipt.namespaces.cbc, 'RegistrationName')[0]?.textContent || '')
				const identification = carrierParty.getElementsByTagNameNS(Receipt.namespaces.cbc, 'ID')[0]
				carrier.setIdentification(new Identification(identification?.getAttribute('schemeID') || '', identification?.textContent || ''))
				this.setCarrier(carrier)
			}

			{ // delivery address
				const deliveryAddress = shipment.getElementsByTagNameNS(Receipt.namespaces.cac, 'DeliveryAddress')[0]
				const address = new Address()
				address.ubigeo = deliveryAddress.getElementsByTagNameNS(Receipt.namespaces.cbc, 'ID')[0]?.textContent || ''
				address.line = deliveryAddress.getElementsByTagNameNS(Receipt.namespaces.cbc, 'Line')[0]?.textContent || ''
				this.setDeliveryAddress(address)
			}

			{ // despatch address
				const despatchAddress = shipment.getElementsByTagNameNS(Receipt.namespaces.cac, 'DespatchAddress')[0]
				const address = new Address()
				address.ubigeo = despatchAddress.getElementsByTagNameNS(Receipt.namespaces.cbc, 'ID')[0]?.textContent || ''
				address.line = despatchAddress.getElementsByTagNameNS(Receipt.namespaces.cbc, 'Line')[0]?.textContent || ''
				this.setDespatchAddress(address)
			}
		}

		return xmlDoc
	}
}

export default Despatch
