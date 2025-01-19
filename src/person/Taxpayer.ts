import Person from "./Person"

import * as asn1js from "asn1js"

interface ASN1Time {
	year: number;
	month: number;
	day: number;
	hour: number;
	minute: number;
	second: number;
}

interface PublicKey {
	n: bigint;
	g: bigint;
}

interface PrivateKey {
	lambda: bigint;
	mu: bigint;
	publicKey: PublicKey;
	p: bigint;
	q: bigint;
}

class Taxpayer extends Person {
	#paillierPublicKey: PublicKey | null = null;
	#paillierPrivateKey: PrivateKey | null = null;

	#certPem: string | null = null;
	#certDer: ArrayBuffer | null = null;
	#keyDer: ArrayBuffer | null = null;

	#solUser = '';
	#solPass = '';

	#solId = '';
	#solSecret = '';

	#deductionsAccount: string | null = null;

	#web: string | null = null;
	#email: string | null = null;
	#telephone: string | null = null;

	#tradeName: string | null = null;

	createPaillierPublicKey(n: bigint, g: bigint) {
		this.#paillierPublicKey = { n, g };
	}

	getPaillierPublicKey() {
		return this.#paillierPublicKey;
	}

	createPaillierPrivateKey(lambda: bigint, mu: bigint, n: bigint, g: bigint, p: bigint, q: bigint) {
		const publicKey = { n, g };
		this.#paillierPublicKey = publicKey;
		this.#paillierPrivateKey = { lambda, mu, publicKey, p, q };
	}

	getPaillierPrivateKey() {
		return this.#paillierPrivateKey;
	}

	/**
	 * @return array containing PEM in single string and DER.
	 */
	static transformPemToDer(base64String: string): [string, ArrayBuffer] {
		// Clean the PEM string
		const pem = base64String
			// remove BEGIN/END
			.replace(/-----(BEGIN|END)[\w\d\s]+-----/g, "")
			// remove \r, \n
			.replace(/[\r\n]/g, "")

		if (typeof Buffer !== 'undefined') {
			// for Node.js, use Buffer.from
			return [ pem, Buffer.from(pem, 'base64') ]
		}
		else if (typeof window !== 'undefined' && typeof window.atob === 'function') {
			// in browser
			const binaryString = window.atob(pem)
			const len = binaryString.length
			const bytes = new Uint8Array(len)

			for (let i = 0; i < len; i++) {
				bytes[i] = binaryString.charCodeAt(i)
			}

			return [ pem, bytes.buffer ]
		}
		else {
			throw new Error('El entorno no es compatible con esta función.')
		}
	}

	/**
	 * @return int -1 when now is out of range of validity or major than -1 for remaining days
	 */
	setCert(c: string) {
		[ this.#certPem, this.#certDer ] = Taxpayer.transformPemToDer(c)

		const asn1: any = asn1js.fromBER(this.#certDer)
		const notBefore = asn1.result.valueBlock.value[0].valueBlock.value[4].valueBlock.value[0]
		const notAfter = asn1.result.valueBlock.value[0].valueBlock.value[4].valueBlock.value[1]

		const timeNotBefore = Date.UTC(
			notBefore.year,
			notBefore.month - 1,
			notBefore.day,
			notBefore.hour,
			notBefore.minute,
			notBefore.second
		)
		const timeNotAfter = Date.UTC(
			notAfter.year,
			notAfter.month - 1,
			notAfter.day,
			notAfter.hour,
			notAfter.minute,
			notAfter.second
		)

		const now = Date.now()
		if(now < timeNotBefore || now > timeNotAfter) {
			return -1
		}
		else {
			return Math.round( ( timeNotAfter - now ) / (1000 * 60 * 60 * 24) )
		}
	}

	/**
	 * @return Buffer created from base64 in setCert()
	 */
	getCert() {
		return this.#certDer
	}

	getCertPem() {
		return this.#certPem
	}

	/**
	 * @return Buffer created from base64 in setKey()
	 */
	getKey() {
		return this.#keyDer
	}

	setKey(k: string) {
		let keyPem: string
		[ keyPem, this.#keyDer ] = Taxpayer.transformPemToDer(k)
	}

	setSolUser(su: string) {
		this.#solUser = su
	}

	getSolUser() {
		return this.#solUser
	}

	setSolPass(sp: string) {
		this.#solPass = sp
	}

	getSolPass() {
		return this.#solPass
	}

	setSolId(id: string) {
		this.#solId = id
	}

	getSolId() {
		return this.#solId
	}

	setSolSecret(secret: string) {
		this.#solSecret = secret
	}

	getSolSecret() {
		return this.#solSecret
	}

	setDeductionsAccount(da: string) {
		if(da.length > 0) {
			this.#deductionsAccount = da
		}
	}

	getDeductionsAccount() {
		return this.#deductionsAccount
	}

	setWeb(w: string) {
		if(w && w.length != 0) {
			this.#web = w
		}
	}

	setEmail(em: string) {
		if(em && em.length != 0) {
			this.#email = em
		}
	}

	setTelephone(t: string) {
		if(t && t.length != 0) {
			this.#telephone = t
		}
	}

	getWeb() {
		return this.#web
	}

	getEmail() {
		return this.#email
	}

	getTelephone() {
		return this.#telephone
	}

	setTradeName(tn: string) {
		this.#tradeName = tn
	}

	getTradeName() {
		return this.#tradeName
	}

	clearData() {
		// Limpiar certificados y llaves
		this.#certPem = null;
		this.#certDer = null;
		this.#keyDer = null;

		// Limpiar credenciales SOL
		this.#solId = '';
		this.#solSecret = '';
		this.#solUser = '';
		this.#solPass = '';

		// Limpiar información de contacto
		this.#web = null;
		this.#email = null;
		this.#telephone = null;
	}
}

export default Taxpayer;
