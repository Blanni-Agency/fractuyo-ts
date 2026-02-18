# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-02-17

### Added
- **Clase Detraction completa** con código catálogo 54 y cuenta bancaria
  - Propiedad `code` para código del bien/servicio sujeto a detracción (catálogo 54)
  - Propiedad `financialAccount` para cuenta bancaria específica del Banco de la Nación
  - Validación de código de 3 dígitos
  - Cálculo automático con umbral de 700 soles
- **Validaciones de serie F/B** en notas de crédito/débito según SUNAT
  - Nota de Factura (tipo 1): Serie debe empezar con F
  - Nota de Boleta (tipo 3): Serie debe empezar con B
- **Parsing completo de impuestos** desde XML en Sale.fromXml()
  - IGV (Impuesto General a las Ventas)
  - EXO (Operaciones exoneradas)
  - ISC (Impuesto Selectivo al Consumo)
  - ICBPER (Impuesto a las Bolsas Plásticas)
  - INA (Operaciones inafectas)
  - OTROS (Otros cargos)
- **Suite de tests** completa con Jest
  - Tests de detracción (invoice.detraction.test.ts)
  - Tests de validaciones (note.test.ts)
- Método `validate()` en clase `Note` para validar series
- Método `setOperationAmount()` en clase `Sale`
- Método `hasDetraction()` en clase `Invoice`
- Método `getDetraction()` en clase `Invoice`
- Parámetro `withoutCalculation` en método `addItem()` de Sale
- Tipos TypeScript para xmllint-wasm

### Changed
- **BREAKING**: `Invoice.setDetractionPercentage()` renombrado a `Invoice.setDetraction()`
- **BREAKING**: Detracción ahora requiere establecer código manualmente con `getDetraction()?.setCode()`
- `NodesGenerator` usa código dinámico de detracción en lugar de hardcoded "037"
- `NodesGenerator` usa cuenta bancaria específica o por defecto del contribuyente
- Parsing XML mejorado en `Sale.fromXml()` con todos los impuestos
- `Invoice.getDetractionPercentage()` marcado como deprecated

### Fixed
- Parsing de XML no recalcula incorrectamente los totales al usar `addItem(item, true)`
- Validación de código de detracción antes de generar XML
- Tipos TypeScript más estrictos para mejor seguridad de tipos

### Dependencies
- Added: `xmllint-wasm@^4.0.2`

## [1.0.2] - 2025-03-12
- Implementación de ESLint
- Enum DocumentType

## [1.0.1] - 2024-01-21
- Migración a ESLint v9

## [1.0.0] - 2024-01-21
- Versión inicial TypeScript migrada desde fractuyo (JavaScript)
