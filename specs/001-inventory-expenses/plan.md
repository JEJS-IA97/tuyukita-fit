# Plan 001 - Inventario de ingredientes y gastos

## Referencias

- Constitucion: `docs/constitution.md`
- Spec activa: `specs/001-inventory-expenses/spec.md`
- Backend existente: NestJS, Prisma y MongoDB en `backend/`
- Cliente actual: `frontend/` sin aplicacion inicializada

## Arquitectura

La aplicacion movil Expo consumira la API REST existente de NestJS. La API mantendra la logica de negocio, las conversiones, la sincronizacion de tasas y el costeo FIFO; el cliente no calculo costos ni consultara proveedores externos directamente.

### Backend

| Modulo | Responsabilidad | RF |
|---|---|---|
| `ingredients` | CRUD, nombre normalizado, unidad y activacion de ingredientes | RF-001 a RF-004 |
| `expense-categories` | CRUD y proteccion de categorias en uso | RF-009a |
| `exchange-rates` | Adaptadores de proveedores, consulta automatica, persistencia de tasas y ultima tasa vigente | RF-016 a RF-020 |
| `expenses` | Gastos manuales y snapshots financieros | RF-007, RF-008, RF-018, RF-020 |
| `inventory` | Lotes, salidas manuales, consumo FIFO, recalculo y detalle de auditoria | RF-010 a RF-015 |
| `ingredient-purchases` | Orquestacion atomica de compra, gasto vinculado y lote | RF-005, RF-006, RF-009, RF-009b |
| `audit` | Registro de creador y cambios relevantes mediante el modelo existente `AuditLog` | RF-022 |

Los controladores y DTO existentes se extenderan o sustituiran de forma compatible. La logica de FIFO vivira en un servicio de dominio sin dependencias HTTP para poder probarla aislada.

### Cliente movil

Se inicializara Expo con TypeScript y Expo Router. La primera navegacion incluira Inicio, Inventario y Gastos; esta spec implementa las pantallas de Inventario y Gastos.

- Lista de ingredientes: stock disponible, unidad, estado, crear, editar y desactivar.
- Compra de ingrediente: formulario con ingrediente, cantidad, costo VES, fecha y selector BCV/USDT; muestra el equivalente USD y la fuente antes de confirmar.
- Salida de inventario: ingrediente, cantidad, fecha y motivo; muestra la existencia antes de confirmar.
- Gastos: listado, categorias configurables y formulario para gastos manuales.
- Tasas: indicador compacto de BCV y USDT, fecha de vigencia, fuente y estado de disponibilidad.

El tema inicial definira tokens para `#014325`, `#82BB2C`, `#F9B02D`, fondo blanco suave y texto oscuro. Los componentes se mantendran sobrios, densos y accesibles; el modo oscuro no entra en esta spec.

## Modelo de datos

Se realizara una migracion aditiva y se conservaran los registros existentes. Antes de aplicarla a datos reales se hara una copia de seguridad de la base de datos.

| Entidad | Datos principales | Proposito |
|---|---|---|
| `Ingredient` | `name`, `normalizedName` unico, `unit`, `isActive` | Evitar duplicados y conservar la unidad unica del ingrediente. |
| `ExpenseCategory` | `name`, `normalizedName` unico, `isActive`, auditoria | Categoria configurable para gastos. |
| `ExchangeRate` | `rateType`, `valueMinor`, `source`, `effectiveDate`, `fetchedAt` | Tasa historica BCV o USDT/VES. |
| `Expense` | categoria, VES menor, USD menor, snapshot de tasa, origen opcional de compra, auditoria | Gasto manual o generado por compra. |
| `IngredientPurchase` | ingrediente, cantidad menor, costo VES/USD, tasa, fecha, gasto vinculado | Compra historica de un ingrediente. |
| `InventoryLot` | compra, cantidad inicial y restante, costos unitarios VES/USD, fecha y orden de registro | Existencia que se consume por FIFO. |
| `InventoryMovement` | ingrediente, tipo `OUT`, cantidad, motivo, fecha, usuario | Salida manual auditable. |
| `InventoryLotConsumption` | movimiento, lote, cantidad y costo historico | Explica los lotes y el costo de cada salida. |

Los importes, tasas y cantidades se representaran como enteros de unidades menores (valor real multiplicado por 100). La API los convertira a valores con dos decimales solo en sus limites de entrada y salida.

## Flujos criticos

### Compra de ingrediente

1. El cliente obtiene o actualiza las tasas disponibles desde la API.
2. El usuario selecciona BCV o USDT e ingresa la compra en VES.
3. La API valida ingrediente activo, tasa valida y campos requeridos.
4. Dentro de una transaccion se crea el gasto, la compra y el lote de inventario vinculados.
5. Se guarda el snapshot VES/USD, la fuente y la tasa usada; luego se registra auditoria.

### Salida y correccion FIFO

1. El usuario registra una salida manual con cantidad y motivo.
2. El servicio ordena los lotes por fecha de compra y, ante empate, por fecha de registro.
3. Si hay existencia suficiente, crea los consumos por lote y guarda el costo de salida; si no, revierte la operacion completa.
4. Al editar o eliminar una compra o salida, el servicio recalcula todos los lotes y consumos del ingrediente en orden cronologico dentro de una transaccion.

### Tasas

1. La API consulta un adaptador configurado para BCV y otro para USDT/VES.
2. Cada respuesta valida valor positivo, fuente, fecha de vigencia y momento de consulta antes de persistirse.
3. Si no hay publicacion nueva, se recupera la ultima tasa vigente almacenada.
4. Si nunca hubo una tasa valida, la API no permite guardar el movimiento dependiente de ella.

## Decisiones y alternativas

| Decision | Se elige | Alternativa descartada | Motivo |
|---|---|---|---|
| Cliente movil | Expo + React Native + TypeScript | Flutter | Comparte TypeScript con NestJS y acelera aprendizaje e integracion inicial. |
| Precision | Enteros escalados por 100 | `Float` o `Decimal` | `Float` acumula error; Prisma no soporta `Decimal` con MongoDB. |
| Actualizacion de tasas | Adaptadores de servidor configurados por entorno | Consulta directa desde el movil | Evita depender del cliente, permite validar, cachear y guardar historial. |
| Fuente de tasas | Proveedor BCV y proveedor USDT intercambiables mediante configuracion | Scraping de Binance P2P o proveedor fijo en codigo | La tasa USDT depende de un mercado de referencia; los proveedores pueden cambiar sus contratos. |
| Consistencia de compra | Transaccion de base de datos | Crear gasto, compra y lote por separado | Impide gastos sin lote o lotes sin gasto. |
| Correcciones FIFO | Recalculo completo por ingrediente y fecha | Ajustar solo el lote editado | Mantiene correctos los consumos posteriores y su costo historico. |
| Eliminacion | Borrado solo sin historial; desactivacion con historial | Borrado fisico de todo registro | Protege auditoria y reportes futuros. |

MongoDB debera ejecutarse en una configuracion compatible con transacciones antes de activar compras y recalculos en produccion.

## Estrategia de pruebas

### Backend

- Pruebas unitarias de normalizacion, redondeo, conversion y algoritmo FIFO, incluyendo empates y movimientos retroactivos.
- Pruebas de servicio con Prisma controlado para comprobar atomicidad, rechazo por inventario insuficiente y proteccion contra duplicados.
- Pruebas de integracion de controladores con autenticacion para validar DTOs, permisos compartidos y respuestas de error.
- Pruebas de adaptadores de tasas con respuestas simuladas: nueva tasa, ultima vigente, datos invalidos y fallo de proveedor.

### Cliente movil

- Pruebas de componentes para formularios, validaciones, estados de carga, errores de tasa e inventario insuficiente.
- Pruebas de integracion del cliente HTTP para que las pantallas muestren datos, errores y confirmaciones sin recalcular valores financieros.

### Matriz de cobertura

| Area de prueba | RF |
|---|---|
| Ingredientes y categorias | RF-001 a RF-004, RF-009a |
| Compra atomica y gastos | RF-005 a RF-009, RF-009b |
| Inventario y FIFO | RF-010 a RF-015 |
| Tasas y snapshots | RF-016 a RF-020 |
| Acceso y auditoria | RF-021, RF-022 |

## Orden de implementacion propuesto

1. Preparar cliente Expo, herramientas de pruebas y configuracion local sin funcionalidad de negocio.
2. Extender Prisma y generar cliente; crear utilidades de importes y auditoria.
3. Implementar ingredientes y categorias con sus pruebas.
4. Implementar proveedores de tasas y snapshots con sus pruebas.
5. Implementar compras atomicas, gastos manuales y sus pruebas.
6. Implementar inventario, FIFO, correcciones y pruebas de regresion.
7. Crear las pantallas Expo y conectar cada flujo a la API.
8. Ejecutar suite completa, validacion RF por RF y verificacion manual en Android.
