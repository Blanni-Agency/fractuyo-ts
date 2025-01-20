import { OptionsSignTransform, Parse, SignedXml } from 'xmldsigjs'
import writtenNumber from 'written-number'
import JSZip from 'jszip'
import { DOMImplementation, DOMParser, XMLSerializer } from '@xmldom/xmldom'
import SoapEnvelope from './xml/SoapEnvelope'
import Endpoint from '../webservice/Endpoint'
import Item from './Item'
import Person from '../person/Person'
import Taxpayer from '../person/Taxpayer'

interface NameSpaces {
	cac: string
	cbc: string
	ds: string
	ext: string
	qdt: string
	udt: string
	xsi: string
	xmlns: string
	ccts: string
}

class Receipt {
	#name = ''
	#taxpayer: Taxpayer
	#customer: Person
	#serie = ''
	#numeration = 0
	#typeCode = ''
	#issueDate: Date | null = null
	#ublVersion = '2.1'
	#customizationId = '2.0'
	#hash = ''
	#items: Item[] = []
	xmlDocument: any

	constructor(taxpayer: Taxpayer, customer: Person, name: string) {
		this.#taxpayer = taxpayer
		this.#customer = customer
		this.#name = name
	}

	setUblVersion(ublVersion: string) {
		this.#ublVersion = ublVersion
	}

	setName(name: string) {
		this.#name = name
	}

	createXmlWrapper() {
		if (!this.#name) throw new Error('Nombre no definido')
		
		const doc = (new DOMImplementation()).createDocument(`urn:oasis:names:specification:ubl:schema:xsd:${this.#name}-2`, this.#name)
		this.xmlDocument = doc as any
		
		if (!this.xmlDocument?.documentElement) throw new Error('Error al crear el documento XML')
		
		this.xmlDocument.documentElement.setAttribute('xmlns:cac', Receipt.namespaces.cac)
		this.xmlDocument.documentElement.setAttribute('xmlns:cbc', Receipt.namespaces.cbc)
		this.xmlDocument.documentElement.setAttribute('xmlns:ds', Receipt.namespaces.ds)
		this.xmlDocument.documentElement.setAttribute('xmlns:ext', Receipt.namespaces.ext)

		// Space for appending signature
		const extUblExtensions = this.xmlDocument.createElementNS(Receipt.namespaces.ext, 'ext:UBLExtensions')
		this.xmlDocument.documentElement.appendChild(extUblExtensions)

		const extUblExtension = this.xmlDocument.createElementNS(Receipt.namespaces.ext, 'ext:UBLExtension')
		extUblExtensions.appendChild(extUblExtension)

		const extExtensionContent = this.xmlDocument.createElementNS(Receipt.namespaces.ext, 'ext:ExtensionContent')
		extUblExtension.appendChild(extExtensionContent)
	}

	get name() {
		return this.#name
	}

	setCustomer(customer: Person) {
		this.#customer = customer
	}

	/**
	 * Format serie and number: F000-00000001
	 */
	getId(withType = false, compacted = false) {
		if(this.#serie == undefined || this.#numeration == undefined) {
			throw new Error('Serie o número incompletos.')
		}
		if(withType) {
			return String(this.#typeCode).padStart(2, '0') + '-' + this.#serie + '-' + ( compacted ? this.#numeration : String(this.#numeration).padStart(8, '0') )
		}
		return this.#serie + '-' + ( compacted ? this.#numeration : String(this.#numeration).padStart(8, '0') )
	}

	setId(serie: string, numeration: number) {
		this.setSerie(serie)
		this.setNumeration(numeration)
	}

	setSerie(serie: string) {
		if(serie.length != 4) {
			throw new Error('Serie inconsistente')
		}
		this.#serie = serie
	}

	getSerie() {
		return this.#serie
	}

	setNumeration(number: number) {
		if(number > 0x5F5E0FF) {
			throw new Error('Numeración supera el límite.')
		}
		this.#numeration = number
	}

	getNumeration() {
		return this.#numeration
	}

	setTypeCode(code: string) {
		this.#typeCode = code
	}

	getTypeCode(withFormat = false) {
		if (withFormat) {
			return String(this.#typeCode).padStart(2, '0')
		}
		return this.#typeCode
	}

	setIssueDate(date?: Date) {
		if(date) {
			this.#issueDate = date
		}
		else {
			this.#issueDate = new Date()
		}
	}

	getIssueDate() {
		return this.#issueDate
	}

	getTaxpayer() {
		return this.#taxpayer
	}

	/**
	 * Replace the taxpayer.
	 */
	setTaxpayer(taxpayer: Taxpayer) {
		this.#taxpayer = taxpayer
	}

	getCustomer() {
		return this.#customer
	}

	getUblVersion() {
		return this.#ublVersion
	}

	getCustomizationId() {
		return this.#customizationId
	}

	setHash(hash: string) {
		this.#hash = hash
	}

	getHash() {
		return this.#hash
	}

	addItem(item: Item) {
		this.#items.push(item)
	}

	/**
	 * Recreate items array without an item.
	 * @param index in array.
	 */
	removeItem(index: number) {
		this.#items = [...this.#items.slice(0, index), ...this.#items.slice(index + 1)]
	}

	clearItems() {
		this.#items = []
	}

	get items() {
		return this.#items
	}

	get taxpayer() {
		return this.#taxpayer
	}

	async sign(cryptoSubtle: SubtleCrypto, hashAlgorithm = 'SHA-256', canonMethod: OptionsSignTransform = 'c14n') {
		if(!this.xmlDocument) {
			throw new Error('Documento XML no existe.')
		}

		const alg = {
			name: 'RSASSA-PKCS1-v1_5',
			hash: hashAlgorithm,
			modulusLength: 1024,
			publicExponent: new Uint8Array([1, 0, 1])
		}

		const keyDer = this.#taxpayer.getKey()
		
		if (!keyDer) throw new Error('No se encontró la llave privada')
		
		const key = await cryptoSubtle.importKey('pkcs8', keyDer, alg, true, ['sign'])
		const x509 = this.#taxpayer.getCertPem()
		if (!x509) throw new Error('No se encontró el certificado X509')

		this.xmlDocument = Parse(this.xmlDocument.toString())

		return Promise.resolve()
			.then(() => {
				const signature = new SignedXml()
				return signature.Sign(
					alg,
					key,
					this.xmlDocument!,
					{
						references: [
							{ id: 'terexoris', uri: '', hash: hashAlgorithm, transforms: ['enveloped', canonMethod] }
						],
						x509: [x509]
						// signerRole: { claimed: ["Taxpayer"] },
						/*
						 * It exists, but Sunat does not handle big numbers (20 bytes) in serial numbers so was removed.
						 * Structure can be found in http://www.datypic.com/sc/ubl21/e-xades_SigningCertificate.html
						 * It could be enabled using global options.
						 */
						// signingCertificate: x509
					}
				)
			})
			.then((signature) => {
				if (!this.xmlDocument) throw new Error('Documento XML no existe')
				
				const xmlEl = this.xmlDocument.getElementsByTagNameNS('urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2', 'ExtensionContent')[0]
				if (!xmlEl) throw new Error('No se encontró el elemento ExtensionContent')
				
				xmlEl.appendChild(signature.GetXml())
				return true
			})
			.catch((e) => {
				console.error(e)
				return false
			})
	}

	/**
	 * @param type according JSZip API.
	 * @param xmlString that is raw XML.
	 * @return A ZIP file containing XML.
	 */
	async createZip(type: JSZip.OutputType = 'base64', xmlString?: string) {
		if (!this.xmlDocument) throw new Error('Documento XML no existe')
		
		const zip = new JSZip()
		const xmlDocumentContent = '<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n' +
			( xmlString ?? (new XMLSerializer().serializeToString(this.xmlDocument)) )
		
		const identification = this.#taxpayer.getIdentification()
		if (!identification) throw new Error('El contribuyente debe tener identificación')
		
		zip.file(`${identification.getNumber()}-${this.getId(true)}.xml`, xmlDocumentContent)

		return zip.generateAsync({type})
	}

	async handleProof(zipStream: string | Uint8Array | ArrayBuffer, isBase64 = true, compacted = false) {
		const zip = new JSZip()
		const identification = this.#taxpayer.getIdentification()
		if (!identification) throw new Error('El contribuyente debe tener identificación')

		return zip.loadAsync(zipStream, {base64: isBase64}).then(async (zip) => {
			const file = zip.file(`R-${identification.getNumber()}-${this.getId(true, compacted)}.xml`)
			if (!file) throw new Error('Archivo no encontrado en el ZIP')
			
			return file.async('string').then(async (data) => {
				const xmlDoc = new DOMParser().parseFromString(data, 'application/xml')
				const codes = xmlDoc.getElementsByTagNameNS('urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2', 'ResponseCode')

				if (codes.length > 0) {
					const description = xmlDoc.getElementsByTagNameNS('urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2', 'Description')[0]?.textContent ?? 'Sin descripción'
					const code = codes[0].textContent
					if (!code) throw new Error('Código de respuesta no encontrado')
					
					return [ parseInt(code), description ]  // 0 when everthing is really OK
				}
				else {
					return [ -1, 'No se encontró respuesta.' ]
				}
			})
		})
	}

	async declare(zipStream: string) {
		const soapXmlDocument = SoapEnvelope.generateSendBill(this, this.#taxpayer, zipStream)
		const responseText = await Endpoint.fetch(Endpoint.INDEX_INVOICE, soapXmlDocument.toString())
		const xmlDoc = new DOMParser().parseFromString(responseText, 'text/xml')
		const faultNode = xmlDoc.getElementsByTagName('soap-env:Fault')[0]

		if (faultNode) {
			const faultString = faultNode.getElementsByTagName('faultstring')[0]?.textContent
			throw new Error(faultString || 'Error desconocido')
		}
		else {
			const responseNode = xmlDoc.getElementsByTagName('br:sendBillResponse')[0]
			if (responseNode) {
				const applicationResponse = responseNode.getElementsByTagName('applicationResponse')[0]?.textContent
				if (!applicationResponse) throw new Error('No se encontró la respuesta de la aplicación')
				return applicationResponse
			}
			else {
				throw new Error('Respuesta inesperada.')
			}
		}
	}

	toString() {
		if (!this.xmlDocument) throw new Error('Documento XML no existe')
		return new XMLSerializer().serializeToString(this.xmlDocument)
	}

	/**
	 * Parse receipt header.
	 * @return xmlDoc parsed.
	 */
	fromXml(xmlContent: string) {
		const xmlDoc = new DOMParser().parseFromString(xmlContent, 'text/xml')
		const idElement = xmlDoc.getElementsByTagNameNS(Receipt.namespaces.cbc, 'ID')[0]
		const id = idElement?.textContent
		
		if (!id) throw new Error('ID no encontrado en el XML')
		
		const [serie, numeration] = id.split('-')
		this.setSerie(serie)
		this.setNumeration(parseInt(numeration))

		const digestValue = xmlDoc.getElementsByTagNameNS(Receipt.namespaces.ds, 'DigestValue')[0]
		if (!digestValue?.textContent) throw new Error('DigestValue no encontrado')
		
		this.setHash(digestValue.textContent)
		return xmlDoc
	}

	validate(validateNumeration = true) {
		if (!this.#serie || this.#serie.length != 4) {
			throw new Error('Serie inconsistente.')
		}

		if (validateNumeration && (!this.#numeration || this.#numeration <= 0 || this.#numeration > 99999999)) {
			throw new Error('Numeración fuera de rango.')
		}

		if (!(this.#issueDate instanceof Date)) {
			throw new Error('No hay fecha de emisión.')
		}
	}

	static namespaces: NameSpaces = Object.freeze({
		cac: 'urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2',
		cbc: 'urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2',
		ds: 'http://www.w3.org/2000/09/xmldsig#',
		ext: 'urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2',
		qdt: 'urn:oasis:names:specification:ubl:schema:xsd:QualifiedDatatypes-2',
		udt: 'urn:un:unece:uncefact:data:specification:UnqualifiedDataTypesSchemaModule:2',
		xsi: 'http://www.w3.org/2001/XMLSchema-instance',
		xmlns: 'http://www.w3.org/1999/xhtml',
		ccts: 'urn:un:unece:uncefact:documentation:2'
	})

	static removeCdataTag(cdata: string) {
		return cdata.trim().replace(/^(\/\/\s*)?<!\[CDATA\[|(\/\/\s*)?\]\]>$/g, '').trim()
	}

	/**
	 * Helper to print a date.
	 * https://stackoverflow.com/a/41480350
	 * @return date as string in format yyyy-mm-dd.
	 */
	static displayDate(date: Date) {
		const day = date.getDate()
		const month = date.getMonth() + 1
		const year = date.getFullYear()

		return year + '-' + ( (month < 10 ? '0' : '') + month ) + '-' + ( (day < 10 ? '0' : '') + day )
	}

	/**
	 * @return time as string in format HH:MM:SS
	 */
	static displayTime(date: Date) {
		const hour = date.getHours()
		const min = date.getMinutes()
		const sec = date.getSeconds()

		return ( (hour < 10 ? '0' : '') + hour ) + ':' + ( (min < 10 ? '0' : '') + min ) + ':' + ( (sec < 10 ? '0' : '') + sec )
	}

	/**
	 * @param amount is a decimal number.
	 */
	static amountToWords(amount: number, junctor: string, tail: string, decimals = 2) {
		if (amount == 0.0) {
			return `CERO ${junctor} 00/100 ${tail}`
		}

		return writtenNumber(amount | 0, { lang: 'es' }) + ` ${junctor} ${amount.toFixed(decimals).split('.')[1]}/100 ${tail}`
	}
}

export default Receipt
