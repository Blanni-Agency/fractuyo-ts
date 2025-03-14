import Receipt from '../Receipt'
import Invoice from '../Invoice'
import Note from '../Note'
import Despatch from '../Despatch'
import Sale from '../Sale'

class NodesGenerator {
	static generateHeader(invoice: Receipt) {
		const cbcUblVersionId = invoice.xmlDocument.createElement('cbc:UBLVersionID')
		cbcUblVersionId.textContent = invoice.getUblVersion()
		invoice.xmlDocument.documentElement.appendChild(cbcUblVersionId)

		const cbcCustomizationId = invoice.xmlDocument.createElement('cbc:CustomizationID')
		cbcCustomizationId.textContent = invoice.getCustomizationId()
		invoice.xmlDocument.documentElement.appendChild(cbcCustomizationId)
	}

	static generateIdentity(invoice: Receipt) {
		const cbcId = invoice.xmlDocument.createElement('cbc:ID')
		cbcId.textContent = invoice.getId()
		invoice.xmlDocument.documentElement.appendChild(cbcId)
	}

	static generateDates(invoice: Receipt) {
		const issueDate = invoice.getIssueDate()
		if(!issueDate) throw new Error('Fecha de emisión no definida')

		const cbcIssueDate = invoice.xmlDocument.createElement('cbc:IssueDate')
		cbcIssueDate.textContent = Receipt.displayDate(issueDate)
		invoice.xmlDocument.documentElement.appendChild(cbcIssueDate)

		const cbcIssueTime = invoice.xmlDocument.createElement('cbc:IssueTime')
		cbcIssueTime.textContent = Receipt.displayTime(issueDate)
		invoice.xmlDocument.documentElement.appendChild(cbcIssueTime)

		if(invoice instanceof Invoice) {
			const dueDate = invoice.getDueDate()
			if(invoice.getTypeCode() === '1' && dueDate && invoice.getShares().length === 0) {
				const cbcDueDate = invoice.xmlDocument.createElement('cbc:DueDate')
				cbcDueDate.textContent = Receipt.displayDate(dueDate)
				invoice.xmlDocument.documentElement.appendChild(cbcDueDate)
			}
		}
	}

	static generateTypeCode(invoice: Receipt) {
		const cbcInvoiceTypeCode = invoice.xmlDocument.createElement(`cbc:${invoice.name}TypeCode`)
		cbcInvoiceTypeCode.textContent = invoice.getTypeCode(true)
		invoice.xmlDocument.documentElement.appendChild(cbcInvoiceTypeCode)

		if(!(invoice.getTypeCode() === '1' || invoice.getTypeCode() === '3')) {
			return
		}

		if(invoice instanceof Invoice && invoice.getDetractionAmount()) {
			cbcInvoiceTypeCode.setAttribute('listID', '1001')
		}
		else {
			cbcInvoiceTypeCode.setAttribute('listID', '0101')
		}
	}

	static generateNotes(invoice: any) {
		const cbcNote = invoice.xmlDocument.createElement('cbc:Note')

		if(invoice.getTypeCode() === '9' || invoice.getTypeCode() === '31') {
			if(!invoice.getNote()) { // if empty
				return
			}

			cbcNote.appendChild( invoice.xmlDocument.createCDATASection(invoice.getNote()) )
			invoice.xmlDocument.documentElement.appendChild(cbcNote)
			return
		}

		cbcNote.setAttribute('languageLocaleID', '1000')
		cbcNote.appendChild( invoice.xmlDocument.createCDATASection(Receipt.amountToWords(invoice.taxInclusiveAmount, 'con', invoice.getCurrencyId())) )
		invoice.xmlDocument.documentElement.appendChild(cbcNote)

		if((invoice.getTypeCode() === '1' || invoice.getTypeCode() === '3') && invoice.getDetractionAmount()) {
			const cbcNote = invoice.xmlDocument.createElement('cbc:Note')
			cbcNote.setAttribute('languageLocaleID', '2006')
			cbcNote.appendChild( invoice.xmlDocument.createCDATASection('Operación sujeta a detracción') )
			invoice.xmlDocument.documentElement.appendChild(cbcNote)
		}
	}

	static generateCurrencyCode(invoice: Sale) {
		const cbcDocumentCurrencyCode = invoice.xmlDocument.createElement('cbc:DocumentCurrencyCode')
		cbcDocumentCurrencyCode.textContent = invoice.getCurrencyId()
		invoice.xmlDocument.documentElement.appendChild(cbcDocumentCurrencyCode)
	}

	static generateReference(invoice: any) {
		if((invoice.getTypeCode() == 1 || invoice.getTypeCode() == 3) && invoice.getOrderReference()) { // for invoice
			const cacOrderReference = invoice.xmlDocument.createElement('cac:OrderReference')
			invoice.xmlDocument.documentElement.appendChild(cacOrderReference)

			{
				const cbcId = invoice.xmlDocument.createElement('cbc:ID')
				cbcId.textContent = invoice.getOrderReference()
				cacOrderReference.appendChild(cbcId)
			}

			if(invoice.getOrderReferenceText()) {
				const cbcCustomerReference = invoice.xmlDocument.createElement('cbc:CustomerReference')
				cbcCustomerReference.appendChild( invoice.xmlDocument.createCDATASection(invoice.getOrderReferenceText()) )
				cacOrderReference.appendChild(cbcCustomerReference)
			}

			return
		}

		if((invoice.getTypeCode() == 7 || invoice.getTypeCode() == 8)) { // for note
			const cacBillingReference = invoice.xmlDocument.createElement('cac:BillingReference')
			invoice.xmlDocument.documentElement.appendChild(cacBillingReference)
			{
				const cacInvoiceDocumentReference = invoice.xmlDocument.createElement('cac:InvoiceDocumentReference')
				cacBillingReference.appendChild(cacInvoiceDocumentReference)
				{
					const cbcID = invoice.xmlDocument.createElement('cbc:ID')
					cbcID.textContent = invoice.getDocumentReference()
					cacInvoiceDocumentReference.appendChild(cbcID)

					const cbcDocumentTypeCode = invoice.xmlDocument.createElement('cbc:DocumentTypeCode')
					cbcDocumentTypeCode.textContent = invoice.getDocumentReferenceTypeCode(true)
					cacInvoiceDocumentReference.appendChild(cbcDocumentTypeCode)
				}
			}
		}
	}

	static generateSignature(invoice: Receipt) {
		const cacSignature = invoice.xmlDocument.createElement('cac:Signature')
		invoice.xmlDocument.documentElement.appendChild(cacSignature)

		const cbcId = invoice.xmlDocument.createElement('cbc:ID')
		cbcId.textContent = invoice.getTaxpayer().getIdentification()?.getNumber()
		cacSignature.appendChild(cbcId)

		{
			const cacSignatoreParty = invoice.xmlDocument.createElement('cac:SignatoryParty')
			cacSignature.appendChild(cacSignatoreParty)

			const cacPartyIdentification = invoice.xmlDocument.createElement('cac:PartyIdentification')
			cacSignatoreParty.appendChild(cacPartyIdentification)

			const cbcId = invoice.xmlDocument.createElement('cbc:ID')
			cbcId.textContent = invoice.getTaxpayer().getIdentification()?.getNumber()
			cacPartyIdentification.appendChild(cbcId)

			const cacPartyName = invoice.xmlDocument.createElement('cac:PartyName')
			cacSignatoreParty.appendChild(cacPartyName)

			const cbcName = invoice.xmlDocument.createElement('cbc:Name')
			cbcName.appendChild( invoice.xmlDocument.createCDATASection(invoice.getTaxpayer().getName()) )
			cacPartyName.appendChild(cbcName)
		}
		{
			const cacDigitalSignatureAttachment = invoice.xmlDocument.createElement('cac:DigitalSignatureAttachment')
			cacSignature.appendChild(cacDigitalSignatureAttachment)

			const cacExternalReference = invoice.xmlDocument.createElement('cac:ExternalReference')
			cacDigitalSignatureAttachment.appendChild(cacExternalReference)

			const cbcUri = invoice.xmlDocument.createElement('cbc:URI')
			cbcUri.textContent = '#teroxoris'
			cacExternalReference.appendChild(cbcUri)
		}
	}

	static generateSupplier(invoice: Receipt) { //Supplier (current taxpayer)
		// Dynamic name for that node
		const supplierNodeName = (invoice.getTypeCode() === '1' || invoice.getTypeCode() === '3' || invoice.getTypeCode() === '7' || invoice.getTypeCode() === '8') ? 'cac:AccountingSupplierParty' :
			(invoice.getTypeCode() === '9' || invoice.getTypeCode() === '31') ? 'cac:DespatchSupplierParty' :
			'cac:SupplierParty' // it's error

		const cacAccountingSupplierParty = invoice.xmlDocument.createElement(supplierNodeName)
		invoice.xmlDocument.documentElement.appendChild(cacAccountingSupplierParty)

		const cacParty = invoice.xmlDocument.createElement('cac:Party')
		cacAccountingSupplierParty.appendChild(cacParty)

		const cacPartyIdentification = invoice.xmlDocument.createElement('cac:PartyIdentification')
		cacParty.appendChild(cacPartyIdentification)

		const taxpayer = invoice.getTaxpayer()
		if(!taxpayer) {
			throw new Error('El comprobante no tiene un contribuyente asociado')
		}

		const identification = taxpayer.getIdentification()
		if(!identification) {
			throw new Error('El contribuyente no tiene una identificación asociada')
		}

		const cbcId = invoice.xmlDocument.createElement('cbc:ID')
		cbcId.setAttribute('schemeID', identification.getType())
		cbcId.setAttribute('schemeName', 'Documento de Identidad')
		cbcId.setAttribute('schemeAgencyName', 'PE:SUNAT')
		cbcId.setAttribute('schemeURI', 'urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo06')
		cbcId.textContent = identification.getNumber()
		cacPartyIdentification.appendChild(cbcId)

		const cacPartyName = invoice.xmlDocument.createElement('cac:PartyName')
		cacParty.appendChild(cacPartyName)

		const cbcName = invoice.xmlDocument.createElement('cbc:Name')
		cbcName.appendChild( invoice.xmlDocument.createCDATASection(taxpayer.getTradeName()) )
		cacPartyName.appendChild(cbcName)

		const cacPartyLegalEntity = invoice.xmlDocument.createElement('cac:PartyLegalEntity')
		cacParty.appendChild(cacPartyLegalEntity)
		{
			const cbcRegistrationName = invoice.xmlDocument.createElement('cbc:RegistrationName')
			cbcRegistrationName.appendChild( invoice.xmlDocument.createCDATASection(taxpayer.getName()) )
			cacPartyLegalEntity.appendChild(cbcRegistrationName)

			const cacRegistrationAddress = invoice.xmlDocument.createElement('cac:RegistrationAddress')
			cacPartyLegalEntity.appendChild(cacRegistrationAddress)
			{
				const cbcId = invoice.xmlDocument.createElement('cbc:ID')
				cbcId.textContent = taxpayer.getAddress()?.ubigeo
				cacRegistrationAddress.appendChild(cbcId)

				const cbcAddressTypeCode = invoice.xmlDocument.createElement('cbc:AddressTypeCode')
				cbcAddressTypeCode.textContent = taxpayer.getAddress()?.typecode
				cacRegistrationAddress.appendChild(cbcAddressTypeCode)

				const cbcCitySubdivisionName = invoice.xmlDocument.createElement('cbc:CitySubdivisionName')
				cbcCitySubdivisionName.textContent = taxpayer.getAddress()?.urbanization
				cacRegistrationAddress.appendChild(cbcCitySubdivisionName)

				const cbcCityName = invoice.xmlDocument.createElement('cbc:CityName')
				cbcCityName.textContent = taxpayer.getAddress()?.city
				cacRegistrationAddress.appendChild(cbcCityName)

				const cbcCountrySubentity = invoice.xmlDocument.createElement('cbc:CountrySubentity')
				cbcCountrySubentity.textContent = taxpayer.getAddress()?.subentity
				cacRegistrationAddress.appendChild(cbcCountrySubentity)

				const cbcDistrict = invoice.xmlDocument.createElement('cbc:District')
				cbcDistrict.textContent = taxpayer.getAddress()?.district
				cacRegistrationAddress.appendChild(cbcDistrict)

				const cacAddressLine = invoice.xmlDocument.createElement('cac:AddressLine')
				cacRegistrationAddress.appendChild(cacAddressLine)

				const cbcLine = invoice.xmlDocument.createElement('cbc:Line')
				cbcLine.appendChild( invoice.xmlDocument.createCDATASection(taxpayer.getAddress()?.line) )
				cacAddressLine.appendChild(cbcLine)

				const cacCountry = invoice.xmlDocument.createElement('cac:Country')
				cacRegistrationAddress.appendChild(cacCountry)

				const cbcIdentificationCode = invoice.xmlDocument.createElement('cbc:IdentificationCode')
				cbcIdentificationCode.textContent = taxpayer.getAddress()?.country
				cacCountry.appendChild(cbcIdentificationCode)
			}
		}

		if( taxpayer.getWeb() || taxpayer.getEmail() || taxpayer.getTelephone() ) {
			//Contact or marketing
			const cacContact = invoice.xmlDocument.createElement('cac:Contact')
			cacParty.appendChild(cacContact)
			{
				if(taxpayer.getTelephone()) {
					const cbcTelephone = invoice.xmlDocument.createElement('cbc:Telephone')
					cbcTelephone.textContent = taxpayer.getTelephone()
					cacContact.appendChild(cbcTelephone)
				}

				if(taxpayer.getEmail()) {
					const cbcElectronicMail = invoice.xmlDocument.createElement('cbc:ElectronicMail')
					cbcElectronicMail.textContent = taxpayer.getEmail()
					cacContact.appendChild(cbcElectronicMail)
				}

				if(taxpayer.getWeb()) {
					const cbcNote = invoice.xmlDocument.createElement('cbc:Note')
					cbcNote.textContent = taxpayer.getWeb()
					cacContact.appendChild(cbcNote)
				}
			}
		}
	}

	static generateCustomer(invoice: Receipt) {
		// Dynamic name for that node
		const customerNodeName = (invoice.getTypeCode() === '1' || invoice.getTypeCode() === '3' || invoice.getTypeCode() === '7' || invoice.getTypeCode() === '8') ? 'cac:AccountingCustomerParty' :
		(invoice.getTypeCode() === '9' || invoice.getTypeCode() === '31') ? 'cac:DeliveryCustomerParty' :
		'cac:CustomerParty' // it's error

		const cacAccountingCustomerParty = invoice.xmlDocument.createElement(customerNodeName)
		invoice.xmlDocument.documentElement.appendChild(cacAccountingCustomerParty)

		const cacParty = invoice.xmlDocument.createElement('cac:Party')
		cacAccountingCustomerParty.appendChild(cacParty)

		const cacPartyIdentification = invoice.xmlDocument.createElement('cac:PartyIdentification')
		cacParty.appendChild(cacPartyIdentification)

		const customer = invoice.getCustomer()
		if(!customer) {
			throw new Error('El comprobante no tiene un cliente asociado')
		}

		const identification = customer.getIdentification()
		if(!identification) {
			throw new Error('El cliente no tiene una identificación asociada')
		}

		const cbcId = invoice.xmlDocument.createElement('cbc:ID')
		cbcId.setAttribute('schemeID', identification.getType())
		cbcId.setAttribute('schemeName', 'Documento de Identidad')
		cbcId.setAttribute('schemeAgencyName', 'PE:SUNAT')
		cbcId.setAttribute('schemeURI', 'urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo06')
		cbcId.textContent = identification.getNumber()
		cacPartyIdentification.appendChild(cbcId)

		const cacPartyLegalEntity = invoice.xmlDocument.createElement('cac:PartyLegalEntity')
		cacParty.appendChild(cacPartyLegalEntity)

		const cbcRegistrationName = invoice.xmlDocument.createElement('cbc:RegistrationName')
		cbcRegistrationName.appendChild( invoice.xmlDocument.createCDATASection(customer.getName()) )
		cacPartyLegalEntity.appendChild(cbcRegistrationName)

		if(invoice.getCustomer().getAddress()) {
			const cacRegistrationAddress = invoice.xmlDocument.createElement('cac:RegistrationAddress')
			cacPartyLegalEntity.appendChild(cacRegistrationAddress)

			const cacAddressLine = invoice.xmlDocument.createElement('cac:AddressLine')
			cacRegistrationAddress.appendChild(cacAddressLine)

			const cbcLine = invoice.xmlDocument.createElement('cbc:Line')
			cbcLine.appendChild( invoice.xmlDocument.createCDATASection(customer.getAddress()?.line) )
			cacAddressLine.appendChild(cbcLine)
		}
	}

	static generateShipment(despatch: Despatch) {
		const cacShipment = despatch.xmlDocument.createElement('cac:Shipment')
		despatch.xmlDocument.documentElement.appendChild(cacShipment)
		{
			const cbcID = despatch.xmlDocument.createElement('cbc:ID')
			cbcID.textContent = 'SUNAT_Envio'
			cacShipment.appendChild(cbcID)

			const cbcHandlingCode = despatch.xmlDocument.createElement('cbc:HandlingCode')
			cbcHandlingCode.setAttribute('listAgencyName', 'PE:SUNAT')
			cbcHandlingCode.setAttribute('listName', 'Motivo de traslado')
			cbcHandlingCode.setAttribute('listURI', 'urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo20')
			cbcHandlingCode.textContent = despatch.getHandlingCode(true)
			cacShipment.appendChild(cbcHandlingCode)

			const cbcGrossWeightMeasure = despatch.xmlDocument.createElement('cbc:GrossWeightMeasure')
			cbcGrossWeightMeasure.setAttribute('unitCode', despatch.getUnitCode())
			cbcGrossWeightMeasure.textContent = despatch.getWeight()
			cacShipment.appendChild(cbcGrossWeightMeasure)

			if(!despatch.getCarrier() && despatch.inLightVehicle()) { // we are sending in own light vehicle
				const cbcSpecialInstructions = despatch.xmlDocument.createElement('cbc:SpecialInstructions')
				cbcSpecialInstructions.textContent = 'SUNAT_Envio_IndicadorTrasladoVehiculoM1L'
				cacShipment.appendChild(cbcSpecialInstructions)
			}

			const cacShipmentStage = despatch.xmlDocument.createElement('cac:ShipmentStage')
			cacShipment.appendChild(cacShipmentStage)
			{
				const cbcTransportModeCode = despatch.xmlDocument.createElement('cbc:TransportModeCode')
				cbcTransportModeCode.setAttribute('listName', 'Modalidad de traslado')
				cbcTransportModeCode.setAttribute('listAgencyName', 'PE:SUNAT')
				cbcTransportModeCode.setAttribute('listURI', 'urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo18')
				cbcTransportModeCode.textContent = !despatch.getCarrier() ? '02' : '01'
				cacShipmentStage.appendChild(cbcTransportModeCode)

				const cacTransitPeriod = despatch.xmlDocument.createElement('cac:TransitPeriod')
				cacShipmentStage.appendChild(cacTransitPeriod)
				{
					const cbcStartDate = despatch.xmlDocument.createElement('cbc:StartDate')
					cbcStartDate.textContent = Receipt.displayDate(despatch.getStartDate())
					cacTransitPeriod.appendChild(cbcStartDate)
				}

				if(despatch.getCarrier()) {
					const cacCarrierParty = despatch.xmlDocument.createElement('cac:CarrierParty')
					cacShipmentStage.appendChild(cacCarrierParty)
					{
						const cacPartyIdentification = despatch.xmlDocument.createElement('cac:PartyIdentification')
						cacCarrierParty.appendChild(cacPartyIdentification)

						{
							const cbcID = despatch.xmlDocument.createElement('cbc:ID')
							cbcID.setAttribute('schemeID', '6')
							cbcID.textContent = despatch.getCarrier().getIdentification().getNumber()
							cacPartyIdentification.appendChild(cbcID)
						}

						const cacPartyLegalEntity = despatch.xmlDocument.createElement('cac:PartyLegalEntity')
						cacCarrierParty.appendChild(cacPartyLegalEntity)
						{
							const cbcRegistrationName = despatch.xmlDocument.createElement('cbc:RegistrationName')
							cbcRegistrationName.appendChild( despatch.xmlDocument.createCDATASection(despatch.getCarrier().getName()) )
							cacPartyLegalEntity.appendChild(cbcRegistrationName)
						}
					}
				}

				if(despatch.getDrivers().length > 0) {
					let driverIndex = 0
					for (const driver of despatch.getDrivers()) {
						const cacDriverPerson = despatch.xmlDocument.createElement('cac:DriverPerson')
						cacShipmentStage.appendChild(cacDriverPerson)

						{
							const cbcID = despatch.xmlDocument.createElement('cbc:ID')
							cbcID.setAttribute('schemeID', driver.getIdentification().getType())
							cbcID.setAttribute('schemeName', 'Documento de Identidad')
							cbcID.setAttribute('schemeAgencyName', 'PE:SUNAT')
							cbcID.setAttribute('schemeURI', 'urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo06')
							cbcID.textContent = driver.getIdentification().getNumber()
							cacDriverPerson.appendChild(cbcID)

							const cbcFirstName = despatch.xmlDocument.createElement('cbc:FirstName')
							cbcFirstName.textContent = driver.getName()
							cacDriverPerson.appendChild(cbcFirstName)

							const cbcFamilyName = despatch.xmlDocument.createElement('cbc:FamilyName')
							cbcFamilyName.textContent = driver.getFamilyName()
							cacDriverPerson.appendChild(cbcFamilyName)

							const cbcJobTitle = despatch.xmlDocument.createElement('cbc:JobTitle')
							cbcJobTitle.textContent = driverIndex++ == 0 ? 'Principal' : 'Secundario'
							cacDriverPerson.appendChild(cbcJobTitle)

							const cacIdentityDocumentReference = despatch.xmlDocument.createElement('cbc:IdentityDocumentReference')
							cacDriverPerson.appendChild(cacIdentityDocumentReference)
							{
								const cbcID = despatch.xmlDocument.createElement('cbc:ID')
								cbcID.textContent = driver.getLicense()
								cacIdentityDocumentReference.appendChild(cbcID)
							}
						}
					}
				}
			}

			const cacDelivery = despatch.xmlDocument.createElement('cac:Delivery')
			cacShipment.appendChild(cacDelivery)
			{
				const cacDeliveryAddress = despatch.xmlDocument.createElement('cac:DeliveryAddress')
				cacDelivery.appendChild(cacDeliveryAddress)
				{
					const cbcID = despatch.xmlDocument.createElement('cbc:ID')
					cbcID.setAttribute('schemeAgencyName', 'PE:INEI')
					cbcID.setAttribute('schemeName', 'Ubigeos')
					cbcID.textContent = despatch.getDeliveryAddress().ubigeo
					cacDeliveryAddress.appendChild(cbcID)

					const cacAddressLine = despatch.xmlDocument.createElement('cac:AddressLine')
					cacDeliveryAddress.appendChild(cacAddressLine)
					{
						const cbcLine = despatch.xmlDocument.createElement('cbc:Line')
						cbcLine.textContent = despatch.getDeliveryAddress().line
						cacAddressLine.appendChild(cbcLine)
					}
				}

				const cacDespatch = despatch.xmlDocument.createElement('cac:Despatch')
				cacDelivery.appendChild(cacDespatch)
				{
					const cacDespatchAddress = despatch.xmlDocument.createElement('cac:DespatchAddress')
					cacDespatch.appendChild(cacDespatchAddress)
					{
						const cbcID = despatch.xmlDocument.createElement('cbc:ID')
						cbcID.setAttribute('schemeAgencyName', 'PE:INEI')
						cbcID.setAttribute('schemeName', 'Ubigeos')
						cbcID.textContent = despatch.getDespatchAddress().ubigeo
						cacDespatchAddress.appendChild(cbcID)

						const cacAddressLine = despatch.xmlDocument.createElement('cac:AddressLine')
						cacDespatchAddress.appendChild(cacAddressLine)
						{
							const cbcLine = despatch.xmlDocument.createElement('cbc:Line')
							cbcLine.textContent = despatch.getDespatchAddress().line
							cacAddressLine.appendChild(cbcLine)
						}
					}
				}
			}

			let packageIndex = 0

			for (const container of despatch.getPackages()) {
				const cacTransportHandlingUnit = despatch.xmlDocument.createElement('cac:TransportHandlingUnit')
				cacShipment.appendChild(cacTransportHandlingUnit)
				{
					const cacPackage = despatch.xmlDocument.createElement('cac:Package')
					cacTransportHandlingUnit.appendChild(cacPackage)
					{
						const cbcID = despatch.xmlDocument.createElement('cbc:ID')
						cbcID.textContent = ++packageIndex
						cacPackage.appendChild(cbcID)

						const cbcTraceID = despatch.xmlDocument.createElement('cbc:TraceID')
						cbcTraceID.textContent = container.traceIdentity
						cacPackage.appendChild(cbcTraceID)
					}
				}
			}

			if(despatch.getVehicles().length > 0) {
				const cacTransportHandlingUnit = despatch.xmlDocument.createElement('cac:TransportHandlingUnit')
				cacShipment.appendChild(cacTransportHandlingUnit)
				{
					const cacTransportEquipment = despatch.xmlDocument.createElement('cac:TransportEquipment')
					cacTransportHandlingUnit.appendChild(cacTransportEquipment)
					{
						const cbcID = despatch.xmlDocument.createElement('cbc:ID')
						cbcID.textContent = despatch.getVehicles()[0].identity
						cacTransportEquipment.appendChild(cbcID)

						if(despatch.getVehicles()[0].registrationIdentity) {
							const cacApplicableTransportMeans = despatch.xmlDocument.createElement('cac:ApplicableTransportMeans')
							cacTransportEquipment.appendChild(cacApplicableTransportMeans)
							{
								const cbcRegistrationNationalityID = despatch.xmlDocument.createElement('cbc:RegistrationNationalityID')
								cbcRegistrationNationalityID.textContent = despatch.getVehicles()[0].registrationIdentity
								cacApplicableTransportMeans.appendChild(cbcRegistrationNationalityID)
							}
						}

						// More vehicles
						if(despatch.getVehicles().length > 1) {
							let index = 0
							for (const vehicle of despatch.getVehicles()) {
								if(index == 0) { // We need to iterate secondary vehicles
									++index
									continue
								}

								const cacAttachedTransportEquipment = despatch.xmlDocument.createElement('cac:AttachedTransportEquipment')
								cacTransportEquipment.appendChild(cacAttachedTransportEquipment)
								{
									const cbcID = despatch.xmlDocument.createElement('cbc:ID')
									cbcID.textContent = vehicle.identity
									cacAttachedTransportEquipment.appendChild(cbcID)

									if(vehicle.registrationIdentity) {
										const cacApplicableTransportMeans = despatch.xmlDocument.createElement('cac:ApplicableTransportMeans')
										cacAttachedTransportEquipment.appendChild(cacApplicableTransportMeans)
										{
											const cbcRegistrationNationalityID = despatch.xmlDocument.createElement('cbc:RegistrationNationalityID')
											cbcRegistrationNationalityID.textContent = vehicle.registrationIdentity
											cacApplicableTransportMeans.appendChild(cbcRegistrationNationalityID)
										}
									}

									if(vehicle.authorization) {
										const cacShipmentDocumentReference = despatch.xmlDocument.createElement('cac:ShipmentDocumentReference')
										cacAttachedTransportEquipment.appendChild(cacShipmentDocumentReference)
										{
											const cbcID = despatch.xmlDocument.createElement('cbc:ID')
											cbcID.setAttribute('schemeID', vehicle.departmentCode)
											cbcID.textContent = vehicle.authorization
											cacShipmentDocumentReference.appendChild(cbcID)
										}
									}
								}
							}
						}

						if(despatch.getVehicles()[0].authorization) {
							const cacShipmentDocumentReference = despatch.xmlDocument.createElement('cac:ShipmentDocumentReference')
							cacTransportEquipment.appendChild(cacShipmentDocumentReference)
							{
								const cbcID = despatch.xmlDocument.createElement('cbc:ID')
								cbcID.setAttribute('schemeID', despatch.getVehicles()[0].departmentCode)
								cbcID.textContent = despatch.getVehicles()[0].authorization
								cacShipmentDocumentReference.appendChild(cbcID)
							}
						}
					}
				}
			}

			const port = despatch.getPort()
			if(port) {
				const cacFirstArrivalPortLocation = despatch.xmlDocument.createElement('cac:FirstArrivalPortLocation')
				cacShipment.appendChild(cacFirstArrivalPortLocation)
				{
					const cbcID = despatch.xmlDocument.createElement('cbc:ID')
					cbcID.setAttribute('schemeAgencyName', 'PE:SUNAT')
					cbcID.setAttribute('schemeName', port.type ? 'Puertos' : 'Aeropuertos')
					cbcID.setAttribute('schemeURI', 'urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo' + (port.type ? '63' : '64'))
					cbcID.textContent = port.identity
					cacFirstArrivalPortLocation.appendChild(cbcID)

					const cbcLocationTypeCode = despatch.xmlDocument.createElement('cbc:LocationTypeCode')
					cbcLocationTypeCode.textContent = port.type ? '1' : '2'
					cacFirstArrivalPortLocation.appendChild(cbcLocationTypeCode)

					const cbcName = despatch.xmlDocument.createElement('cbc:Name')
					cbcName.textContent = despatch.name
					cacFirstArrivalPortLocation.appendChild(cbcName)
				}
			}
		}
	}

	static generatePaymentMeans(invoice: Invoice) {
		if(invoice.getDetractionAmount()) {
			const cacPaymentMeans = invoice.xmlDocument.createElement('cac:PaymentMeans')
			invoice.xmlDocument.documentElement.appendChild(cacPaymentMeans)
			{
				const cbcID = invoice.xmlDocument.createElement('cbc:ID')
				cbcID.textContent = 'Detraccion'
				cacPaymentMeans.appendChild(cbcID)

				const cbcPaymentMeansCode = invoice.xmlDocument.createElement('cbc:PaymentMeansCode')
				cbcPaymentMeansCode.textContent = '003'
				cacPaymentMeans.appendChild(cbcPaymentMeansCode)

				const cacPayeeFinancialAccount = invoice.xmlDocument.createElement('cac:PayeeFinancialAccount')
				cacPaymentMeans.appendChild(cacPayeeFinancialAccount)
				{
					const cbcID = invoice.xmlDocument.createElement('cbc:ID')
					cbcID.textContent = invoice.getTaxpayer().getDeductionsAccount()
					cacPayeeFinancialAccount.appendChild(cbcID)
				}
			}

			const cacPaymentTerms = invoice.xmlDocument.createElement('cac:PaymentTerms')
			invoice.xmlDocument.documentElement.appendChild(cacPaymentTerms)
			{
				const cbcID = invoice.xmlDocument.createElement('cbc:ID')
				cbcID.textContent = 'Detraccion'
				cacPaymentTerms.appendChild(cbcID)

				const cbcPaymentMeansID = invoice.xmlDocument.createElement('cbc:PaymentMeansID')
				cbcPaymentMeansID.textContent = '037'
				cacPaymentTerms.appendChild(cbcPaymentMeansID)

				const cbcPaymentPercent = invoice.xmlDocument.createElement('cbc:PaymentPercent')
				cbcPaymentPercent.textContent = invoice.getDetractionPercentage()
				cacPaymentTerms.appendChild(cbcPaymentPercent)

				const cbcAmount  = invoice.xmlDocument.createElement('cbc:Amount')
				cbcAmount.setAttribute('currencyID', invoice.getCurrencyId())
				cbcAmount.textContent = Number(invoice.getDetractionAmount()).toFixed(2)
				cacPaymentTerms.appendChild(cbcAmount)
			}
		}
	}

	static generatePaymentTerms(invoice: Invoice) {
		if(invoice.getShares().length == 0) { //Cash Payment
			const cacPaymentTerms = invoice.xmlDocument.createElement('cac:PaymentTerms')
			invoice.xmlDocument.documentElement.appendChild(cacPaymentTerms)
			{
				const cbcID = invoice.xmlDocument.createElement('cbc:ID')
				cbcID.textContent = 'FormaPago'
				cacPaymentTerms.appendChild(cbcID)

				const cbcPaymentMeansID = invoice.xmlDocument.createElement('cbc:PaymentMeansID')
				cbcPaymentMeansID.textContent = 'Contado'
				cacPaymentTerms.appendChild(cbcPaymentMeansID)
			}

			return
		}

		//Credit payment
		const cacPaymentTerms = invoice.xmlDocument.createElement('cac:PaymentTerms')
		invoice.xmlDocument.documentElement.appendChild(cacPaymentTerms)
		{
			const cbcID = invoice.xmlDocument.createElement('cbc:ID')
			cbcID.textContent = 'FormaPago'
			cacPaymentTerms.appendChild(cbcID)

			const cbcPaymentMeansID = invoice.xmlDocument.createElement('cbc:PaymentMeansID')
			cbcPaymentMeansID.textContent = 'Credito'
			cacPaymentTerms.appendChild(cbcPaymentMeansID)

			const cbcAmount = invoice.xmlDocument.createElement('cbc:Amount')
			cbcAmount.setAttribute('currencyID', invoice.getCurrencyId())

			const detractionAmount = invoice.getDetractionAmount()
			if(detractionAmount) {
				cbcAmount.textContent = (invoice.taxInclusiveAmount - Number(detractionAmount)).toFixed(2)
			}
			else {
				cbcAmount.textContent = invoice.taxInclusiveAmount.toFixed(2)
			}
			cacPaymentTerms.appendChild(cbcAmount)
		}

		let c = 0
		for (const share of invoice.getShares()) {
			const cacPaymentTerms = invoice.xmlDocument.createElement('cac:PaymentTerms')
			invoice.xmlDocument.documentElement.appendChild(cacPaymentTerms)
			{
				const cbcID = invoice.xmlDocument.createElement('cbc:ID')
				cbcID.textContent = 'FormaPago'
				cacPaymentTerms.appendChild(cbcID)

				const cbcPaymentMeansID = invoice.xmlDocument.createElement('cbc:PaymentMeansID')
				cbcPaymentMeansID.textContent = 'Cuota' + String(++c).padStart(3, '0')
				cacPaymentTerms.appendChild(cbcPaymentMeansID)

				const cbcAmount = invoice.xmlDocument.createElement('cbc:Amount')
				cbcAmount.setAttribute('currencyID', invoice.getCurrencyId())
				cbcAmount.textContent = share.getAmountWithFormat()
				cacPaymentTerms.appendChild(cbcAmount)

				const cbcPaymentDueDate = invoice.xmlDocument.createElement('cbc:PaymentDueDate')
				cbcPaymentDueDate.textContent = Receipt.displayDate(share.getDueDate())
				cacPaymentTerms.appendChild(cbcPaymentDueDate)
			}
		}
	}

	static generateCharge(invoice: Invoice) {
		const discount = invoice.getDiscount()
		if(discount) {
			const cacAllowanceCharge = invoice.xmlDocument.createElement('cac:AllowanceCharge')
			invoice.xmlDocument.documentElement.appendChild(cacAllowanceCharge)
			{
				const cbcChargeIndicator = invoice.xmlDocument.createElement('cbc:ChargeIndicator')
				cbcChargeIndicator.textContent = discount.indicator
				cacAllowanceCharge.appendChild(cbcChargeIndicator)

				const cbcAllowanceChargeReasonCode = invoice.xmlDocument.createElement('cbc:AllowanceChargeReasonCode')
				cbcAllowanceChargeReasonCode.textContent = discount.getTypeCode()
				cacAllowanceCharge.appendChild(cbcAllowanceChargeReasonCode)

				const cbcMultiplierFactorNumeric = invoice.xmlDocument.createElement('cbc:MultiplierFactorNumeric')
				cbcMultiplierFactorNumeric.textContent = discount.factor.toFixed(5)
				cacAllowanceCharge.appendChild(cbcMultiplierFactorNumeric)

				const cbcAmount = invoice.xmlDocument.createElement('cbc:Amount')
				cbcAmount.setAttribute('currencyID', invoice.getCurrencyId())
				cbcAmount.textContent = discount.amount.toFixed(2)
				cacAllowanceCharge.appendChild(cbcAmount)

				const cbcBaseAmount = invoice.xmlDocument.createElement('cbc:BaseAmount')
				cbcBaseAmount.setAttribute('currencyID', invoice.getCurrencyId())
				cbcBaseAmount.textContent = discount.baseAmount.toFixed(2)
				cacAllowanceCharge.appendChild(cbcBaseAmount)
			}
		}
	}

	static generateTaxes(invoice: any) {
		const cacTaxTotal = invoice.xmlDocument.createElement('cac:TaxTotal')
		invoice.xmlDocument.documentElement.appendChild(cacTaxTotal)
		{
			const cbcTaxAmount = invoice.xmlDocument.createElement('cbc:TaxAmount')
			cbcTaxAmount.setAttribute('currencyID', invoice.getCurrencyId())
			cbcTaxAmount.textContent = invoice.taxTotalAmount.toFixed(2)
			cacTaxTotal.appendChild(cbcTaxAmount)

			//Assign data according taxability
			let taxTypeCode
			let taxSchemeId
			let taxSchemeName
			// loop all types of taxes
			for (let operationIndex = 0; operationIndex < 4; ++operationIndex) { // 4 steps
				if(invoice.getOperationAmount(operationIndex) <= 0) {
					continue // if that slot is zero then do nothing
				}

				switch (operationIndex) {
					case 0: { // "gravado"
						taxTypeCode = 'VAT'
						taxSchemeId = '1000'
						taxSchemeName = 'IGV'
						break
					}
					case 1: { // "exonerado"
						taxTypeCode = 'VAT'
						taxSchemeId = '9997'
						taxSchemeName = 'EXO'
						break
					}
					case 2: { // "inafecto"
						taxTypeCode = 'FRE'
						taxSchemeId = '9998'
						taxSchemeName = 'INA'
						break
					}
					default: {
						taxTypeCode = 'OTH'
						taxSchemeId = '9999'
						taxSchemeName = 'OTROS CONCEPTOS DE PAGO'
					}
				}

				const cacTaxSubtotal = invoice.xmlDocument.createElement('cac:TaxSubtotal')
				cacTaxTotal.appendChild(cacTaxSubtotal)
				{
					const cbcTaxableAmount = invoice.xmlDocument.createElement('cbc:TaxableAmount')
					cbcTaxableAmount.setAttribute('currencyID', invoice.getCurrencyId())
					cbcTaxableAmount.textContent = invoice.getOperationAmount(operationIndex).toFixed(2)
					cacTaxSubtotal.appendChild( cbcTaxableAmount )

					const cbcTaxAmount = invoice.xmlDocument.createElement('cbc:TaxAmount')
					cbcTaxAmount.setAttribute('currencyID', invoice.getCurrencyId())
					cbcTaxAmount.textContent = operationIndex ? '0.00' : invoice.igvAmount.toFixed(2)
					cacTaxSubtotal.appendChild(cbcTaxAmount)

					const cacTaxCategory = invoice.xmlDocument.createElement('cac:TaxCategory')
					cacTaxSubtotal.appendChild(cacTaxCategory)
					{
						const cacTaxScheme = invoice.xmlDocument.createElement('cac:TaxScheme')
						cacTaxCategory.appendChild(cacTaxScheme)
						{
							const cbcID = invoice.xmlDocument.createElement('cbc:ID')
							cbcID.setAttribute('schemeName', 'Codigo de tributos')
							cbcID.setAttribute('schemeAgencyName', 'PE:SUNAT')
							cbcID.setAttribute('schemeURI', 'urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo05')
							cbcID.textContent = taxSchemeId
							cacTaxScheme.appendChild(cbcID)

							const cbcName = invoice.xmlDocument.createElement('cbc:Name')
							cbcName.textContent = taxSchemeName
							cacTaxScheme.appendChild(cbcName)

							const cbcTaxTypeCode = invoice.xmlDocument.createElement('cbc:TaxTypeCode')
							cbcTaxTypeCode.textContent = taxTypeCode
							cacTaxScheme.appendChild(cbcTaxTypeCode)
						}
					}
				}
			}
		}
	}

	static generateTotal(invoice: any) {
		const cacLegalMonetaryTotal = invoice.xmlDocument.createElement('cac:LegalMonetaryTotal')
		invoice.xmlDocument.documentElement.appendChild(cacLegalMonetaryTotal)
		{
			const cbcLineExtensionAmount = invoice.xmlDocument.createElement('cbc:LineExtensionAmount')
			cbcLineExtensionAmount.setAttribute('currencyID', invoice.getCurrencyId())
			cbcLineExtensionAmount.textContent = invoice.lineExtensionAmount.toFixed(2)
			cacLegalMonetaryTotal.appendChild(cbcLineExtensionAmount)

			const cbcTaxInclusiveAmount = invoice.xmlDocument.createElement('cbc:TaxInclusiveAmount')
			cbcTaxInclusiveAmount.setAttribute('currencyID', invoice.getCurrencyId())
			cbcTaxInclusiveAmount.textContent = invoice.taxInclusiveAmount.toFixed(2)
			cacLegalMonetaryTotal.appendChild(cbcTaxInclusiveAmount)

			const cbcPayableAmount  = invoice.xmlDocument.createElement('cbc:PayableAmount')
			cbcPayableAmount.setAttribute('currencyID', invoice.getCurrencyId())
			cbcPayableAmount.textContent = invoice.taxInclusiveAmount.toFixed(2)
			cacLegalMonetaryTotal.appendChild(cbcPayableAmount)
		}
	}

	static generateLines(invoice: any) {
		let itemIndex = 0 // for ID
		for (const item of invoice.items) { //Items
			const cacInvoiceLine = invoice.xmlDocument.createElement(invoice.getTypeCode() == 9 || invoice.getTypeCode() == 31 ? 'cac:DespatchLine' : `cac:${invoice.name}Line`)
			invoice.xmlDocument.documentElement.appendChild(cacInvoiceLine)

			const cbcID = invoice.xmlDocument.createElement('cbc:ID')
			cbcID.textContent = ++itemIndex
			cacInvoiceLine.appendChild(cbcID)

			// Dynamic name for that node
			const quantityNodeName = (invoice.getTypeCode() == 1 || invoice.getTypeCode() == 3) ? 'cbc:InvoicedQuantity' :
				invoice.getTypeCode() == 7 ? 'cbc:CreditedQuantity' :
				invoice.getTypeCode() == 8 ? 'cbc:DebitedQuantity' :
				invoice.getTypeCode() == 9 || invoice.getTypeCode() == 31 ? 'cbc:DeliveredQuantity' :
				'cbc:Quantity' // it's error

			const cbcInvoicedQuantity = invoice.xmlDocument.createElement(quantityNodeName)
			cbcInvoicedQuantity.setAttribute('unitCode', item.getUnitCode())
			cbcInvoicedQuantity.setAttribute('unitCodeListID', 'UN/ECE rec 20')
			cbcInvoicedQuantity.setAttribute('unitCodeListAgencyName', 'United Nations Economic Commission for Europe')
			cbcInvoicedQuantity.textContent = item.getQuantity(true, 10)
			cacInvoiceLine.appendChild(cbcInvoicedQuantity)

			if( (invoice.getTypeCode() == 9 || invoice.getTypeCode() == 31)) {
				const cacOrderLineReference = invoice.xmlDocument.createElement('cac:OrderLineReference')
				cacInvoiceLine.appendChild(cacOrderLineReference)

				const cbcLineID = invoice.xmlDocument.createElement('cbc:LineID')
				cbcLineID.textContent = itemIndex // TODO: check if is incoming this data for using that value
				cacOrderLineReference.appendChild(cbcLineID)
			}
			else {
				const cbcLineExtensionAmount = invoice.xmlDocument.createElement('cbc:LineExtensionAmount')
				cbcLineExtensionAmount.setAttribute('currencyID', invoice.getCurrencyId())
				cbcLineExtensionAmount.textContent = item.getLineExtensionAmount(true)
				cacInvoiceLine.appendChild(cbcLineExtensionAmount)

				{ //PricingReference
					const cacPricingReference = invoice.xmlDocument.createElement('cac:PricingReference')
					cacInvoiceLine.appendChild(cacPricingReference)

					const cacAlternativeConditionPrice = invoice.xmlDocument.createElement('cac:AlternativeConditionPrice')
					cacPricingReference.appendChild(cacAlternativeConditionPrice)

					const cbcPriceAmount = invoice.xmlDocument.createElement('cbc:PriceAmount')
					cbcPriceAmount.setAttribute('currencyID', invoice.getCurrencyId())
					cbcPriceAmount.textContent = item.getPricingReferenceAmount(true, 10)
					cacAlternativeConditionPrice.appendChild(cbcPriceAmount)

					const cbcPriceTypeCode = invoice.xmlDocument.createElement('cbc:PriceTypeCode')
					cbcPriceTypeCode.textContent = '01'
					cacAlternativeConditionPrice.appendChild(cbcPriceTypeCode)
				}

				{ //TaxTotal
					const cacTaxTotal = invoice.xmlDocument.createElement('cac:TaxTotal')
					cacInvoiceLine.appendChild(cacTaxTotal)

					const cbcTaxAmount = invoice.xmlDocument.createElement('cbc:TaxAmount')
					cbcTaxAmount.setAttribute('currencyID', invoice.getCurrencyId())
					cbcTaxAmount.textContent = item.getTaxTotalAmount(true)
					cacTaxTotal.appendChild(cbcTaxAmount)

					//Assign data according taxability
					let taxTypeCode
					let taxSchemeId
					let taxSchemeName
					switch (true) {
						case (item.getExemptionReasonCode() < 20): { // "gravado"
							taxTypeCode = 'VAT'
							taxSchemeId = '1000'
							taxSchemeName = 'IGV'
							break
						}
						case (item.getExemptionReasonCode() < 30): { // "exonerado"
							taxTypeCode = 'VAT'
							taxSchemeId = '9997'
							taxSchemeName = 'EXO'
							break
						}
						case (item.getExemptionReasonCode() < 40): { // "inafecto"
							taxTypeCode = 'FRE'
							taxSchemeId = '9998'
							taxSchemeName = 'INA'
							break
						}
						default: {
							taxTypeCode = 'OTH'
							taxSchemeId = '9999'
							taxSchemeName = 'OTROS CONCEPTOS DE PAGO'
						}
					}

					if(item.getIscAmount() > 0) { //ISC
						const cacTaxSubtotal = invoice.xmlDocument.createElement('cac:TaxSubtotal')
						cacTaxTotal.appendChild(cacTaxSubtotal)

						const cbcTaxableAmount = invoice.xmlDocument.createElement('cbc:TaxableAmount')
						cbcTaxableAmount.setAttribute('currencyID', invoice.getCurrencyId())
						cbcTaxableAmount.textContent = item.getLineExtensionAmount(true)
						cacTaxSubtotal.appendChild(cbcTaxableAmount)

						const cbcTaxAmount = invoice.xmlDocument.createElement('cbc:TaxAmount')
						cbcTaxAmount.setAttribute('currencyID', invoice.getCurrencyId())
						cbcTaxAmount.textContent = item.getIscAmount(true)
						cacTaxSubtotal.appendChild(cbcTaxAmount)

						const cacTaxCategory = invoice.xmlDocument.createElement('cac:TaxCategory')
						cacTaxSubtotal.appendChild(cacTaxCategory)
						{
							const cbcPercent = invoice.xmlDocument.createElement('cbc:Percent')
							cbcPercent.textContent = item.getIscPercentage()
							cacTaxCategory.appendChild(cbcPercent)

							const cbcTierRange = invoice.xmlDocument.createElement('cbc:TierRange')
							cbcTierRange.textContent = '01'
							cacTaxCategory.appendChild(cbcTierRange)

							const cacTaxScheme = invoice.xmlDocument.createElement('cac:TaxScheme')
							cacTaxCategory.appendChild(cacTaxScheme)
							{
								const cbcID = invoice.xmlDocument.createElement('cbc:ID')
								cbcID.textContent = '2000'
								cacTaxScheme.appendChild(cbcID)

								const cbcName = invoice.xmlDocument.createElement('cbc:Name')
								cbcName.textContent = 'ISC'
								cacTaxScheme.appendChild(cbcName)

								const cbcTaxTypeCode = invoice.xmlDocument.createElement('cbc:TaxTypeCode')
								cbcTaxTypeCode.textContent = 'EXC'
								cacTaxScheme.appendChild(cbcTaxTypeCode)
							}
						}
					}

					{
						const cacTaxSubtotal = invoice.xmlDocument.createElement('cac:TaxSubtotal')
						cacTaxTotal.appendChild(cacTaxSubtotal)

						const cbcTaxableAmount = invoice.xmlDocument.createElement('cbc:TaxableAmount')
						cbcTaxableAmount.setAttribute('currencyID', invoice.getCurrencyId())
						cbcTaxableAmount.textContent = item.getTaxableIgvAmount(true)
						cacTaxSubtotal.appendChild(cbcTaxableAmount)

						const cbcTaxAmount = invoice.xmlDocument.createElement('cbc:TaxAmount')
						cbcTaxAmount.setAttribute('currencyID', invoice.getCurrencyId())
						cbcTaxAmount.textContent = item.getIgvAmount(true)
						cacTaxSubtotal.appendChild(cbcTaxAmount)

						const cacTaxCategory = invoice.xmlDocument.createElement('cac:TaxCategory')
						cacTaxSubtotal.appendChild(cacTaxCategory)
						{
							const cbcPercent = invoice.xmlDocument.createElement('cbc:Percent')
							cbcPercent.textContent = item.getIgvPercentage()
							cacTaxCategory.appendChild(cbcPercent)

							const cbcTaxExemptionReasonCode = invoice.xmlDocument.createElement('cbc:TaxExemptionReasonCode')
							cbcTaxExemptionReasonCode.textContent = item.getExemptionReasonCode()
							cacTaxCategory.appendChild(cbcTaxExemptionReasonCode)

							const cacTaxScheme = invoice.xmlDocument.createElement('cac:TaxScheme')
							cacTaxCategory.appendChild(cacTaxScheme)
							{
								const cbcID = invoice.xmlDocument.createElement('cbc:ID')
								cbcID.textContent = taxSchemeId
								cacTaxScheme.appendChild(cbcID)

								const cbcName = invoice.xmlDocument.createElement('cbc:Name')
								cbcName.textContent = taxSchemeName
								cacTaxScheme.appendChild(cbcName)

								const cbcTaxTypeCode = invoice.xmlDocument.createElement('cbc:TaxTypeCode')
								cbcTaxTypeCode.textContent = taxTypeCode
								cacTaxScheme.appendChild(cbcTaxTypeCode)
							}
						}
					} // block of exemption
				}
			}

			{ //Item
				const cacItem = invoice.xmlDocument.createElement('cac:Item')
				cacInvoiceLine.appendChild(cacItem)

				const cbcDescription = invoice.xmlDocument.createElement('cbc:Description')
				cbcDescription.appendChild( invoice.xmlDocument.createCDATASection(item.getDescription()) )
				cacItem.appendChild(cbcDescription)

				if(item.getCode()) {
					const cacSellersItemIdentification = invoice.xmlDocument.createElement('cac:SellersItemIdentification')
					cacItem.appendChild(cacSellersItemIdentification)

					const cbcID = invoice.xmlDocument.createElement('cbc:ID')
					cbcID.textContent = item.getCode()
					cacSellersItemIdentification.appendChild(cbcID)
				}

				if(item.getClassificationCode()) {
					const cacCommodityClassification = invoice.xmlDocument.createElement('cac:CommodityClassification')
					cacItem.appendChild(cacCommodityClassification)

					const cbcItemClassificationCode = invoice.xmlDocument.createElement('cbc:ItemClassificationCode')
					cbcItemClassificationCode.setAttribute('listID', 'UNSPSC')
					cbcItemClassificationCode.setAttribute('listAgencyName', 'GS1 US')
					cbcItemClassificationCode.setAttribute('listName', 'Item Classification')
					cbcItemClassificationCode.textContent = item.getClassificationCode()
					cacCommodityClassification.appendChild(cbcItemClassificationCode)
				}
			}

			if( !(invoice.getTypeCode() == 9 || invoice.getTypeCode() == 31)) {
				{ //Price
					const cacPrice = invoice.xmlDocument.createElement('cac:Price')
					cacInvoiceLine.appendChild(cacPrice)

					const cbcPriceAmount = invoice.xmlDocument.createElement('cbc:PriceAmount')
					cbcPriceAmount.setAttribute('currencyID', invoice.getCurrencyId())
					cbcPriceAmount.textContent = item.getUnitValue(true, 10)
					cacPrice.appendChild(cbcPriceAmount)
				}
			}
		}
	}

	static generateDiscrepancy(note: Note) {
		const cacDiscrepancyResponse = note.xmlDocument.createElement('cac:DiscrepancyResponse')
		note.xmlDocument.documentElement.appendChild(cacDiscrepancyResponse)
		{
			const cbcReferenceID = note.xmlDocument.createElement('cbc:ReferenceID')
			cbcReferenceID.textContent = note.getDocumentReference()
			cacDiscrepancyResponse.appendChild(cbcReferenceID)

			const cbcResponseCode = note.xmlDocument.createElement('cbc:ResponseCode')
			cbcResponseCode.textContent = note.getResponseCode(true)
			cacDiscrepancyResponse.appendChild(cbcResponseCode)

			const cbcDescription = note.xmlDocument.createElement('cbc:Description')
			cbcDescription.textContent = note.getDescription()
			cacDiscrepancyResponse.appendChild(cbcDescription)
		}
	}
}

export default NodesGenerator
