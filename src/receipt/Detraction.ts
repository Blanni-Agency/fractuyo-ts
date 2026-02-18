/**
 * Detracción - Sistema de pago adelantado de impuestos a SUNAT
 * Catálogo 54: Bienes y servicios sujetos a detracción
 */
class Detraction {
  private percentage       : number = 0
  private amount           : number = 0.0
  private code?            : string  // Catálogo 54 (3 dígitos, ej: "037")
  private financialAccount?: string  // Cuenta bancaria BN

  /**
   * Establece el porcentaje de detracción
   * @param percentage - Porcentaje entre 0 y 100
   * @throws Error si el porcentaje es inválido
   */
  setPercentage(percentage: number): void {
    if(percentage >= 0 && percentage <= 100) {
      this.percentage = percentage
      return
    }
    this.percentage = 0
    throw new Error('Porcentaje de detracción inconsistente.')
  }

  getPercentage(): number {
    return this.percentage
  }

  /**
   * Establece el código del bien/servicio sujeto a detracción
   * @param code - Código de 3 dígitos del catálogo 54
   * Ejemplos: "001", "037", "040"
   */
  setCode(code: string): void {
    if(code.length === 3) {
      this.code = code
    }
  }

  getCode(): string | undefined {
    return this.code
  }

  getAmount(): number {
    return this.amount
  }

  setFinancialAccount(account: string): void {
    this.financialAccount = account
  }

  getFinancialAccount(): string | undefined {
    return this.financialAccount
  }

  /**
   * Calcula el monto de detracción
   * REGLA: Solo aplica si el total es mayor a 700 soles
   * @param taxInclusiveAmount - Monto total con impuestos incluidos
   */
  calcAmount(taxInclusiveAmount: number): void {
    if(this.percentage > 0) {
      if(taxInclusiveAmount > 700) {
        this.amount = taxInclusiveAmount * this.percentage / 100
        return
      }
      this.amount = 0.0 // No aplica si total <= 700
    } else {
      this.amount = 0.0
    }
  }
}

export default Detraction
