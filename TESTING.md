# Datos de Prueba SUNAT

Este archivo contiene los datos oficiales de prueba proporcionados por SUNAT para el desarrollo y testing de sistemas de facturación electrónica.

## 🔐 Credenciales de Prueba (Ambiente Beta)

### RUC de Prueba
```
RUC: 20000000001
```

### Credenciales SOL (SOAP)
```
Usuario: [RUC]MODDATOS
Password: moddatos

Ejemplo completo:
Usuario: 20000000001MODDATOS
Password: moddatos
```

### Credenciales REST (Guías de Remisión)
```
Client ID: test-85e5b0ae-255c-4891-a595-0b98c65c9854
Client Secret: test-Hty/M6QshYvPgItX2P0+Kw==
```

## 🌐 Endpoints de Prueba

### Ambiente Beta (SOAP)
**Facturas, Boletas, Notas de Crédito/Débito:**
```
https://e-beta.sunat.gob.pe/ol-ti-itcpfegem-beta/billService?wsdl
```

**Retenciones y Percepciones:**
```
https://e-beta.sunat.gob.pe/ol-ti-itemision-otroscpe-gem-beta/billService?wsdl
```

### Ambiente de Prueba (REST)
**Guías de Remisión - Token:**
```
https://gre-test.nubefact.com/v1/clientessol/{client_id}/oauth2/token
```

**Guías de Remisión - Envío:**
```
https://gre-test.nubefact.com/v1/contribuyente/gem/comprobantes/
```

**Guías de Remisión - Consulta:**
```
https://gre-test.nubefact.com/v1/contribuyente/gem/comprobantes/envios/{ticket}
```

## 🔑 Certificado Digital de Prueba

### Opción 1: Sin Certificado (Beta)
El ambiente beta de SUNAT **NO requiere** certificado digital registrado.

### Opción 2: Certificado de Prueba
Puedes obtener certificados de prueba (sin validez legal) de:
- **Llama.pe**: https://llama.pe
- Formato: PFX, P12
- Uso: Solo para testing/demostración

### Opción 3: Certificado CDT Gratuito (Producción)
SUNAT ofrece Certificado Digital Tributario (CDT) gratuito para producción.

**Requisitos:**
- ✅ Capacidad legal plena (personas naturales)
- ✅ Inscrito y activo (personas jurídicas)
- ✅ Estado RUC: HABIDO
- ✅ No estar suspendido temporalmente
- ✅ No estar registrado como OSE o PSE

## 📝 Datos de Prueba Comunes

### Identificación
```typescript
// RUC (tipo 6)
new Identification(6, '20000000001')

// DNI (tipo 1) - Ejemplos válidos
new Identification(1, '12345678')  // 8 dígitos numéricos

// Carnet de Extranjería (tipo 4)
new Identification(4, 'ABC123456')  // Máx 12 caracteres
```

### Monedas
```typescript
invoice.setCurrencyId('PEN')  // Soles
invoice.setCurrencyId('USD')  // Dólares
```

### Series de Comprobantes
```typescript
// Facturas
invoice.setSerie('F001')  // Debe empezar con F

// Boletas
invoice.setSerie('B001')  // Debe empezar con B

// Notas de Crédito de Factura
note.setSerie('F001')     // Debe empezar con F

// Notas de Crédito de Boleta
note.setSerie('B001')     // Debe empezar con B

// Guías de Remisión (Remitente)
despatch.setSerie('T001')  // Debe empezar con T

// Guías de Remisión (Transportista)
despatch.setSerie('V001')  // Debe empezar con V
```

### Códigos de Detracción (Catálogo 54)
```typescript
// Ejemplos comunes
'001': 'Azúcar'
'003': 'Alcohol etílico'
'037': 'Demás servicios gravados con el IGV'
'040': 'Transporte de bienes por vía terrestre'
'022': 'Leche'
```

## 🔄 Proceso de Homologación

Para pasar a producción, SUNAT requiere:

1. **Registrar certificado digital**
2. **Confirmar email registrado**
3. **Enviar casos de prueba**:
   - Facturas con IGV
   - Facturas exoneradas
   - Facturas gratuitas
   - Boletas de venta
   - Notas de crédito
   - Notas de débito
   - Guías de remisión

## 📚 Referencias Oficiales

- [SUNAT - Facturación Electrónica](https://www.sunat.gob.pe)
- [Greenter - Documentación](https://greenter.dev)
- [Llama.pe - Certificados de Prueba](https://llama.pe)

## ⚠️ Importante

- ✅ Los datos de prueba son SOLO para ambiente beta
- ❌ NO usar en producción
- ✅ El ambiente beta NO valida certificados digitales
- ✅ Todos los comprobantes en beta son de prueba
- ✅ Para producción, debes completar el proceso de homologación

---

**Última actualización:** 2026-02-17
**Fuente:** SUNAT - Ambiente de Prueba Beta
