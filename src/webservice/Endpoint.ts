import Rest from './Rest'
import Receipt from '../receipt/Receipt'
import Taxpayer from '../person/Taxpayer'

interface UrlConfig {
	deploy: string
	test: string
}

interface TokenResponse {
	access_token: string
	[key: string]: unknown
}

interface StatusResponse {
	success: boolean
	message?: string
	data?: unknown
}

interface SendResponse {
	success: boolean
	message?: string
	ticket?: string
	data?: unknown
}

class Endpoint {
	// true for deployment; false for test
	static #mode: boolean = false

	static #token: string = ''

	static #offset: number = 4

	static readonly INDEX_INVOICE: number = 0
	static readonly INDEX_RETENTION: number = 1

	static readonly INDEX_TOKEN: number = 1 << Endpoint.#offset
	static readonly INDEX_SEND: number = 2 << Endpoint.#offset
	static readonly INDEX_STATUS: number = 3 << Endpoint.#offset
	static readonly #REST_MASK: number = 0b111 << Endpoint.#offset // despatch is here

	static #fetchFunction: typeof fetch = fetch // use the default or standard JavaScript fetch

	static setFetchFunction(customFetch: typeof fetch): void {
		Endpoint.#fetchFunction = customFetch
	}

	static setMode(mode: boolean): void {
		Endpoint.#mode = mode
	}

	/**
	 * @param service is index integer.
	 * @param url is a string for that endpoint.
	 * @param deploymentMode is boolean with true. False to test.
	 */
	static setUrl(service: number, url: string, deploymentMode: boolean = false): void {
		// setting classic services
		if (service === Endpoint.INDEX_INVOICE || service === Endpoint.INDEX_RETENTION) {
			if (deploymentMode) {
				Endpoint.#urls[service].deploy = url
			}
			else {
				Endpoint.#urls[service].test = url
			}

			return // nothing else
		}

		// setting "new" services
		if ((service & Endpoint.#REST_MASK) !== 0) {
			service >>= Endpoint.#offset
			--service
			if (deploymentMode) {
				Endpoint.#restUrls[service].deploy = url
			}
			else {
				Endpoint.#restUrls[service].test = url
			}
		}
	}

	static #urls: UrlConfig[] = [
		{ // invoice
			deploy: 'https://e-factura.sunat.gob.pe/ol-ti-itcpfegem/billService',
			test: 'https://e-beta.sunat.gob.pe/ol-ti-itcpfegem-beta/billService'
		},
		{ // retention
			deploy: 'https://e-factura.sunat.gob.pe/ol-ti-itemision-otroscpe-gem/billService',
			test: 'https://e-beta.sunat.gob.pe/ol-ti-itemision-otroscpe-gem-beta/billService'
		}
	]

	/**
	 * Currently for despatchs but looks like for any document.
	 */
	static #restUrls: UrlConfig[] = [
		{ // despatch token
			deploy: 'https://api-seguridad.sunat.gob.pe/v1/clientessol/<client_id>/oauth2/token',
			test: 'https://gre-test.nubefact.com/v1/clientessol/<client_id>/oauth2/token'
		},
		{ // despatch send
			deploy: 'https://api-cpe.sunat.gob.pe/v1/contribuyente/gem/comprobantes/', // ending: {numRucEmisor}-{codCpe}-{numSerie}-{numCpe}
			test: 'https://gre-test.nubefact.com/v1/contribuyente/gem/comprobantes/'
		},
		{ // despatch status
			deploy: 'https://api-cpe.sunat.gob.pe/v1/contribuyente/gem/comprobantes/envios/', // ending: {numTicket}
			test: 'https://gre-test.nubefact.com/v1/contribuyente/gem/comprobantes/envios/'
		}
	]

	static getUrl(service: number, mode?: boolean): string {
		// Use what is in current scope
		if (mode === undefined) {
			mode = Endpoint.#mode
		}

		if (service === Endpoint.INDEX_INVOICE || service === Endpoint.INDEX_RETENTION) {
			return mode ? Endpoint.#urls[service].deploy : Endpoint.#urls[service].test
		}

		if ((service & Endpoint.#REST_MASK) !== 0) {
			service >>= Endpoint.#offset
			--service
			return mode ? Endpoint.#restUrls[service].deploy : Endpoint.#restUrls[service].test
		}

		throw new Error('Invalid service')
	}

	static async fetch(service: number, body: string): Promise<string> {
		const url = Endpoint.getUrl(service)

		const response = await Endpoint.#fetchFunction(url, {
			method: 'POST',
			headers: {'Content-Type': 'text/xml;charset=UTF-8'},
			body: body
		})
		const responseText = await response.text()

		return responseText
	}

	static async fetchStatus(ticket: string): Promise<StatusResponse> {
		const url = Endpoint.getUrl(Endpoint.INDEX_STATUS)

		const response = await Endpoint.#fetchFunction(url.concat(ticket), {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json', 
				'Authorization': `Bearer ${Endpoint.#token}`
			}
		})
		const responseJson = await response.json()

		return responseJson
	}

	static async fetchSend(body: string, receipt: Receipt): Promise<SendResponse> {
		const url = Endpoint.getUrl(Endpoint.INDEX_SEND)

		const taxpayer = receipt.getTaxpayer()
		if (!taxpayer) {
			throw new Error('El comprobante no tiene un contribuyente asociado')
		}

		const identification = taxpayer.getIdentification()
		if (!identification) {
			throw new Error('El contribuyente no tiene una identificación asociada')
		}

		const response = await Endpoint.#fetchFunction(
			url.concat(`${identification.getNumber()}-${receipt.getId(true)}`), 
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json', 
					'Authorization': `Bearer ${Endpoint.#token}`
				},
				body: body
			}
		)
		const responseJson = await response.json()

		return responseJson
	}

	static async fetchToken(taxpayer: Taxpayer): Promise<TokenResponse> {
		const url = Endpoint.getUrl(Endpoint.INDEX_TOKEN)

		const data = Rest.generateToken(taxpayer)

		const response = await Endpoint.#fetchFunction(url.replace('<client_id>', taxpayer.getSolId()), {
			method: 'POST',
			headers: {'Content-Type': 'application/x-www-form-urlencoded'},
			body: data
		})
		const responseJson = await response.json()

		// Hold value
		Endpoint.#token = responseJson.access_token

		return responseJson
	}

	static get token(): string {
		return Endpoint.#token
	}

	static set token(token: string) {
		Endpoint.#token = token
	}
}

export default Endpoint