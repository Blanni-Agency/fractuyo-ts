class Address {
	#line = '';
	#country = '';
	#ubigeo = '';
	#typecode = '';
	#urbanization = '';
	#city = '';
	#subentity = '';
	#district = '';

	constructor() {
	}

	get line() {
		return this.#line;
	}

	get country() {
		return this.#country;
	}

	get ubigeo() {
		return this.#ubigeo;
	}

	get typecode() {
		return this.#typecode;
	}

	get urbanization() {
		return this.#urbanization;
	}

	get city() {
		return this.#city;
	}

	get subentity() {
		return this.#subentity;
	}

	get district() {
		return this.#district;
	}

	set line(line: string) {
		if (line.length > 0) {
			this.#line = line;
		}
	}

	set country(country: string) {
		this.#country = country;
	}

	set ubigeo(ubigeo: string) {
		this.#ubigeo = ubigeo;
	}

	set typecode(code: string) {
		this.#typecode = code;
	}

	set urbanization(urbanization: string) {
		this.#urbanization = urbanization;
	}

	set city(city: string) {
		this.#city = city;
	}

	set subentity(subentity: string) {
		this.#subentity = subentity;
	}

	set district(district: string) {
		this.#district = district;
	}
}

export default Address;
