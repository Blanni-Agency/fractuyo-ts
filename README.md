# Fractuyo-ts

Biblioteca TypeScript para la generación de comprobantes electrónicos según el estándar UBL 2.1 de SUNAT.

> Este proyecto es un port a TypeScript de la librería original [Fractuyo](https://github.com/terexor/fractuyo), manteniendo la misma funcionalidad pero añadiendo todas las ventajas del tipado estático.

## ¿Por qué usar Fractuyo-ts?

- ✨ Tipado estático completo con TypeScript
- 🚀 Autocompletado mejorado en tu IDE
- 💪 Detección de errores en tiempo de desarrollo
- 📦 Misma funcionalidad que la librería original
- 🔒 Código más seguro y mantenible

## Instalación

```bash
npm install fractuyo-ts
```

## Documentación

### Tipos de Comprobantes Soportados

- ✅ Facturas (Invoice)
- ✅ Boletas de Venta (Invoice)
- ✅ Notas de Crédito (CreditNote)
- ✅ Notas de Débito (DebitNote)

### Tipos de Identificación

| Código | Descripción |
|--------|-------------|
| 6 | RUC |
| 1 | DNI |
| 4 | Carnet de Extranjería |
| 7 | Pasaporte |

### Unidades de Medida Comunes

| Código | Descripción |
|--------|-------------|
| NIU | Unidad (UN) |
| KGM | Kilogramo (KG) |
| LTR | Litro (L) |
| MTR | Metro (M) |
| ZZ | Servicio |

## Características Adicionales

- 🔐 Generación de XML firmado
- ✅ Validación de datos según SUNAT
- 🔄 Soporte completo para UBL 2.1

## Contribuir

Las contribuciones son bienvenidas. Por favor, abre un issue o un pull request.

## Créditos

Este proyecto es un port a TypeScript de [Fractuyo](https://github.com/terexor/fractuyo), desarrollado originalmente por [Terexor](https://github.com/terexor). Todos los créditos de la funcionalidad base corresponden a los autores originales.

## Licencia

MIT
