# Tareas 001 - Inventario de ingredientes y gastos

Cada tarea se implementa con pruebas primero, se ejecuta su suite aplicable y requiere aprobacion antes de pasar a la siguiente.

## Fundacion

- [x] **T001 - Inicializar el cliente Expo con TypeScript**
  - RF: soporte para la spec.
  - Hecho cuando: `frontend/` contiene el proyecto Expo y el comando de desarrollo inicia sin errores.

- [x] **T002 - Configurar navegacion base y tema de marca del cliente**
  - RF: soporte para la spec.
  - Hecho cuando: Expo Router muestra navegacion para Inicio, Inventario y Gastos con tokens de color de Yukita Fit.

- [x] **T003 - Configurar pruebas y lint del cliente movil**
  - RF: soporte para la spec.
  - Hecho cuando: existe una prueba de componente basica y los comandos de prueba y lint finalizan en verde.

- [x] **T004 - Establecer base de pruebas del backend para los nuevos modulos**
  - RF: soporte para la spec.
  - Hecho cuando: Jest ejecuta una prueba de servicio con Prisma simulado sin afectar la base de datos.

- [x] **T005 - Verificar respaldo y soporte transaccional de la base de datos de desarrollo**
  - RF: soporte para RF-005, RF-009b y RF-012b.
  - Hecho cuando: queda documentado el respaldo realizado o la ausencia de datos, y se verifica que el entorno admite transacciones antes de aplicar el esquema.

- [x] **T006 - Crear utilidades de normalizacion y valores escalados**
  - RF: RF-001a, RF-006, RF-007, RF-013, RF-018.
  - Hecho cuando: pruebas cubren normalizacion de nombres y conversion bidireccional con redondeo a dos decimales.

## Persistencia

- [x] **T007 - Ampliar el esquema para ingredientes y categorias configurables**
  - RF: RF-001a, RF-003, RF-003a, RF-009a.
  - Hecho cuando: Prisma genera el cliente con nombre normalizado unico y entidad de categoria activa.

- [x] **T008 - Ampliar el esquema para snapshots de tasas y gastos**
  - RF: RF-006, RF-007, RF-018, RF-020.
  - Hecho cuando: compras y gastos pueden referenciar categoria, tipo de tasa, fuente, fecha y valores VES/USD historicos.

- [x] **T009 - Ampliar el esquema para lotes, salidas y consumos FIFO**
  - RF: RF-005, RF-010 a RF-015.
  - Hecho cuando: Prisma genera las entidades y relaciones de lote, movimiento y consumo sin errores.

- [x] **T010 - Aplicar el esquema en desarrollo y comprobar integridad basica**
  - RF: soporte para RF-001 a RF-022.
  - Hecho cuando: el esquema se sincroniza en desarrollo, el cliente Prisma se genera y las pruebas existentes siguen verdes.

## Ingredientes y categorias

- [x] **T011 - Probar y crear ingrediente con nombre unico normalizado**
  - RF: RF-001, RF-001a.
  - Hecho cuando: crear `Yuca`, `yuca` o ` YUCA ` no permite duplicados y las pruebas estan verdes.

- [x] **T012 - Probar y actualizar datos configurables de ingrediente**
  - RF: RF-002.
  - Hecho cuando: se actualizan datos permitidos sin perder compras, lotes ni consumos historicos.

- [ ] **T013 - Probar desactivacion, eliminacion segura y bloqueo de unidad**
  - RF: RF-003, RF-003a, RF-004.
  - Hecho cuando: un ingrediente con historial se desactiva y bloquea cambio de unidad; uno sin historial se elimina.

- [ ] **T014 - Exponer el API de ingredientes con validacion y autenticacion**
  - RF: RF-001 a RF-004, RF-021, RF-022.
  - Hecho cuando: pruebas de controlador validan solicitudes autenticadas y errores de negocio.

- [ ] **T015 - Probar CRUD de categorias de gastos**
  - RF: RF-009a.
  - Hecho cuando: crear, editar y eliminar una categoria sin uso funciona; una categoria referenciada queda protegida.

- [ ] **T016 - Exponer el API de categorias de gastos**
  - RF: RF-009a, RF-021, RF-022.
  - Hecho cuando: el API lista y modifica categorias configurables con validacion.

## Tasas y conversiones

- [ ] **T017 - Definir el contrato de adaptador de tasas y sus pruebas**
  - RF: RF-016, RF-017.
  - Hecho cuando: pruebas con proveedores simulados verifican tipo, valor positivo, fuente, fecha de vigencia y consulta.

- [ ] **T018 - Implementar el adaptador BCV configurable**
  - RF: RF-016, RF-017.
  - Hecho cuando: una fuente BCV configurada se consulta en el servidor y produce un snapshot valido probado.

- [ ] **T019 - Implementar el adaptador USDT/VES configurable**
  - RF: RF-016, RF-017.
  - Hecho cuando: una fuente USDT/VES configurada se consulta en el servidor y produce un snapshot valido probado.

- [ ] **T020 - Persistir tasas y recuperar la ultima vigente**
  - RF: RF-017, RF-019, RF-020.
  - Hecho cuando: pruebas cubren nueva tasa, fin de semana/feriado y preservacion de snapshots ya usados.

- [ ] **T021 - Exponer consulta y refresco de tasas en la API**
  - RF: RF-016 a RF-019a, RF-021.
  - Hecho cuando: el API devuelve BCV y USDT con fuente/fechas o un error claro si nunca hubo una tasa valida.

## Gastos, compras e inventario

- [ ] **T022 - Probar y crear gastos manuales con snapshot financiero**
  - RF: RF-007, RF-008, RF-018, RF-020.
  - Hecho cuando: un gasto manual guarda categoria, VES, USD, tasa y usuario sin crear inventario.

- [ ] **T023 - Exponer el API de gastos manuales**
  - RF: RF-007, RF-008, RF-018, RF-021, RF-022.
  - Hecho cuando: el API crea, lista y consulta gastos manuales con respuestas validadas.

- [ ] **T024 - Probar la transaccion de compra, gasto y lote**
  - RF: RF-005, RF-006, RF-009, RF-022.
  - Hecho cuando: una compra crea exactamente un gasto vinculado y un lote, y un fallo no deja registros parciales.

- [ ] **T025 - Exponer el API de compras de ingredientes**
  - RF: RF-005, RF-006, RF-009, RF-018, RF-021.
  - Hecho cuando: el API registra compras autenticadas con tasa seleccionada y devuelve sus snapshots.

- [ ] **T026 - Probar el algoritmo FIFO puro**
  - RF: RF-012, RF-012a, RF-013, RF-014.
  - Hecho cuando: pruebas cubren un lote, multiples lotes, empate por registro y rechazo por existencia insuficiente.

- [ ] **T027 - Persistir salida manual y sus consumos FIFO**
  - RF: RF-011 a RF-015, RF-022.
  - Hecho cuando: una salida crea movimiento y detalle de lotes consumidos con costo USD historico.

- [ ] **T028 - Exponer stock y salidas de inventario en la API**
  - RF: RF-010 a RF-015, RF-021.
  - Hecho cuando: el API muestra existencia por ingrediente, registra salida y consulta su detalle FIFO.

- [ ] **T029 - Probar recosteo por correcciones cronologicas**
  - RF: RF-009b, RF-012b.
  - Hecho cuando: editar o eliminar una compra o salida retroactiva recalcula lotes y consumos en orden cronologico.

- [ ] **T030 - Exponer correccion y eliminacion segura de compras, gastos y salidas**
  - RF: RF-009b, RF-022.
  - Hecho cuando: el API corrige o elimina registros permitidos sin movimientos huerfanos y registra auditoria.

## Cliente movil

- [ ] **T031 - Crear cliente HTTP autenticado y tipos de dominio del movil**
  - RF: RF-021.
  - Hecho cuando: el cliente movil consume endpoints autenticados y maneja estados de carga y error.

- [ ] **T032 - Implementar pantalla de ingredientes y formulario CRUD**
  - RF: RF-001 a RF-004.
  - Hecho cuando: se pueden crear, editar, desactivar o eliminar ingredientes desde el movil con validaciones visibles.

- [ ] **T033 - Implementar gestion movil de categorias de gastos**
  - RF: RF-009a.
  - Hecho cuando: el usuario crea, edita y elimina categorias desde la aplicacion.

- [ ] **T034 - Implementar indicador movil de tasas**
  - RF: RF-016 a RF-019a.
  - Hecho cuando: la aplicacion muestra BCV y USDT con fuente, fecha, ultima vigencia y errores comprensibles.

- [ ] **T035 - Implementar formulario movil de compra de ingrediente**
  - RF: RF-005, RF-006, RF-009, RF-018.
  - Hecho cuando: el formulario muestra la conversion USD antes de confirmar y registra una compra exitosa.

- [ ] **T036 - Implementar consulta de inventario y salida manual movil**
  - RF: RF-010 a RF-015.
  - Hecho cuando: se visualiza stock y se registra una salida con validacion de existencia insuficiente.

- [ ] **T037 - Implementar gastos manuales y categorias en el movil**
  - RF: RF-007, RF-008, RF-018.
  - Hecho cuando: se crea y consulta un gasto manual sin modificar inventario.

## Cierre

- [ ] **T038 - Ejecutar regresion completa y validar RF por RF**
  - RF: RF-001 a RF-022.
  - Hecho cuando: suites de backend y movil estan verdes y cada RF tiene una prueba enlazada en la validacion final.

- [ ] **T039 - Verificar los flujos en Android y documentar configuracion local**
  - RF: RF-001 a RF-022.
  - Hecho cuando: los flujos de ingredientes, compra, gasto y salida se prueban manualmente en Android y la configuracion necesaria queda documentada.
