declare module 'xmllint-wasm' {
  export interface ValidationResult {
    valid: boolean
    errors?: string[]
  }

  export interface ValidationInput {
    xml: Array<{
      fileName: string
      contents: string
    }>
    schema: string
    preload?: Record<string, string>
  }

  export function validateXML(input: ValidationInput): Promise<ValidationResult>
}
