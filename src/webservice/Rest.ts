import { Application } from 'xmldsigjs'
import Taxpayer from '../person/Taxpayer'
import Receipt from '../receipt/Receipt'

interface SendResponse {
	archivo: {
		nomArchivo: string
		hashZip: string
		arcGreZip: string
	}
}

class Rest {
	/**
	 * Genera los parámetros para obtener un token de autenticación
	 * @param taxpayer El contribuyente que solicita el token
	 * @returns URLSearchParams con los datos necesarios para la solicitud
	 * @throws Error si el contribuyente no tiene identificación
	 */
	static generateToken(taxpayer: Taxpayer): URLSearchParams {
		const identification = taxpayer.getIdentification()
		if (!identification) {
			throw new Error('El contribuyente no tiene una identificación asociada')
		}
		
		const data = new URLSearchParams()
		data.append('grant_type', 'password')
		data.append('scope', 'https://api-cpe.sunat.gob.pe')
		data.append('client_id', taxpayer.getSolId())
		data.append('client_secret', taxpayer.getSolSecret())
		data.append('username', `${identification.getNumber()}${taxpayer.getSolUser()}`)
		data.append('password', taxpayer.getSolPass())

		return data
	}

	/**
	 * Genera los datos necesarios para enviar un comprobante
	 * @param receipt El comprobante a enviar
	 * @param zipStream El contenido del archivo ZIP en base64
	 * @returns Objeto con los datos necesarios para el envío
	 * @throws Error si el comprobante no tiene contribuyente o identificación asociada
	 */
	static async generateSend(receipt: Receipt, zipStream: string): Promise<SendResponse> {
		let zipBuffer: ArrayBuffer
		
		if (typeof Buffer !== 'undefined') {
			// for Node.js, use Buffer.from
			zipBuffer = Buffer.from(zipStream, 'base64').buffer
		}
		else if (typeof window !== 'undefined' && typeof window.atob === 'function') {
			// in browser
			const binaryString = window.atob(zipStream)
			const len = binaryString.length
			const bytes = new Uint8Array(len)

			for (let i = 0; i < len; i++) {
				bytes[i] = binaryString.charCodeAt(i)
			}

			zipBuffer = bytes.buffer
		}
		else {
			throw new Error('El entorno no es compatible con esta función.')
		}

		const hash = await Application.crypto.subtle.digest('SHA-256', zipBuffer)

		const bytes = new Uint8Array(hash)
		const hexChars = new Array(bytes.length)

		for (let i = 0; i < bytes.length; ++i) {
			hexChars[i] = bytes[i].toString(16).padStart(2, '0')
		}

		const taxpayer = receipt.getTaxpayer()
		if (!taxpayer) {
			throw new Error('El comprobante no tiene un contribuyente asociado')
		}

		const identification = taxpayer.getIdentification()
		if (!identification) {
			throw new Error('El contribuyente no tiene una identificación asociada')
		}

		return {
			'archivo' : {
				'nomArchivo': `${identification.getNumber()}-${receipt.getId(true)}.zip`,
				'hashZip': hexChars.join(''), // in documentation looks like base64 but documentation is bad
				'arcGreZip': zipStream
			}
		}
	}
}

export default Rest