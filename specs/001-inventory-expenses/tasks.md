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

- [x] **T013 - Probar desactivacion, eliminacion segura y bloqueo de unidad**
  - RF: RF-003, RF-003a, RF-004.
  - Hecho cuando: un ingrediente con historial se desactiva y bloquea cambio de unidad; uno sin historial se elimina.

- [x] **T014 - Exponer el API de ingredientes con validacion y autenticacion**
  - RF: RF-001 a RF-004, RF-021, RF-022.
  - Hecho cuando: pruebas de controlador validan solicitudes autenticadas y errores de negocio.

- [x] **T015 - Probar CRUD de categorias de gastos**
  - RF: RF-009a.
  - Hecho cuando: crear, editar y eliminar una categoria sin uso funciona; una categoria referenciada queda protegida.

- [x] **T016 - Exponer el API de categorias de gastos**
  - RF: RF-009a, RF-021, RF-022.
  - Hecho cuando: el API lista y modifica categorias configurables con validacion.

## Tasas y conversiones

- [x] **T017 - Definir el contrato de adaptador de tasas y sus pruebas**
  - RF: RF-016, RF-017.
  - Hecho cuando: pruebas con proveedores simulados verifican tipo, valor positivo, fuente, fecha de vigencia y consulta.

- [x] **T018 - Implementar el adaptador BCV configurable**
  - RF: RF-016, RF-017.
  - Hecho cuando: una fuente BCV configurada se consulta en el servidor y produce un snapshot valido probado.

- [x] **T019 - Implementar el adaptador USDT/VES configurable**
  - RF: RF-016, RF-017.
  - Hecho cuando: una fuente USDT/VES configurada se consulta en el servidor y produce un snapshot valido probado.

- [x] **T020 - Persistir tasas y recuperar la ultima vigente**
  - RF: RF-017, RF-019, RF-020.
  - Hecho cuando: pruebas cubren nueva tasa, fin de semana/feriado y preservacion de snapshots ya usados.

- [x] **T021 - Exponer consulta y refresco de tasas en la API**
  - RF: RF-016 a RF-019a, RF-021.
  - Hecho cuando: el API devuelve BCV y USDT con fuente/fechas o un error claro si nunca hubo una tasa valida.

## Gastos, compras e inventario

- [x] **T022 - Probar y crear gastos manuales con snapshot financiero**
  - RF: RF-007, RF-008, RF-018, RF-020.
  - Hecho cuando: un gasto manual guarda categoria, VES, USD, tasa y usuario sin crear inventario.

- [x] **T023 - Exponer el API de gastos manuales**
  - RF: RF-007, RF-008, RF-018, RF-021, RF-022.
  - Hecho cuando: el API crea, lista y consulta gastos manuales con respuestas validadas.

- [x] **T024 - Probar la transaccion de compra, gasto y lote**
  - RF: RF-005, RF-006, RF-009, RF-022.
  - Hecho cuando: una compra crea exactamente un gasto vinculado y un lote, y un fallo no deja registros parciales.

- [x] **T025 - Exponer el API de compras de ingredientes**
  - RF: RF-005, RF-006, RF-009, RF-018, RF-021.
  - Hecho cuando: el API registra compras autenticadas con tasa seleccionada y devuelve sus snapshots.

- [x] **T026 - Probar el algoritmo FIFO puro**
  - RF: RF-012, RF-012a, RF-013, RF-014.
  - Hecho cuando: pruebas cubren un lote, multiples lotes, empate por registro y rechazo por existencia insuficiente.

- [x] **T027 - Persistir salida manual y sus consumos FIFO**
  - RF: RF-011 a RF-015, RF-022.
  - Hecho cuando: una salida crea movimiento y detalle de lotes consumidos con costo USD historico.

- [x] **T028 - Exponer stock y salidas de inventario en la API**
  - RF: RF-010 a RF-015, RF-021.
  - Hecho cuando: el API muestra existencia por ingrediente, registra salida y consulta su detalle FIFO.

- [x] **T029 - Probar recosteo por correcciones cronologicas**
  - RF: RF-009b, RF-012b.
  - Hecho cuando: editar o eliminar una compra o salida retroactiva recalcula lotes y consumos en orden cronologico.

- [x] **T030 - Exponer correccion y eliminacion segura de compras, gastos y salidas**
  - RF: RF-009b, RF-022.
  - Hecho cuando: el API corrige o elimina registros permitidos sin movimientos huerfanos y registra auditoria.

## Cliente movil

- [x] **T031 - Crear cliente HTTP autenticado y tipos de dominio del movil**
  - RF: RF-021.
  - Hecho cuando: el cliente movil consume endpoints autenticados y maneja estados de carga y error.

- [x] **T032 - Implementar portada y acceso con login**
  - RF: RF-021.
  - Diseno: `docs/design/examples/portada.jpg`.
  - Hecho cuando: la app abre en la portada, el login autentica a Jose, Jai o Vivi, la sesion persiste entre reinicios y las rutas protegidas redirigen al login.
  - [x] Restaurar sesion al arrancar (tokens en SecureStore y `GET /auth/me`).
  - [x] Pantalla de portada con navegacion a login.
  - [x] Formulario de login con credenciales invalidas visibles y estado de carga.

- [ ] **T033 - Implementar dashboard de inicio con indicador de tasas**
  - RF: RF-007, RF-008, RF-010, RF-016 a RF-019a.
  - Diseno: `docs/design/examples/budget.png` y `docs/design/mockup-inicio.html`.
  - Hecho cuando: Inicio muestra BCV y USDT con fuente y fecha, resumen de gastos del mes en VES/USD y ingredientes con existencia critica, con carga y errores comprensibles.
  - [ ] Tarjetas de tasas BCV/USDT con fuente, valor y fecha de vigencia; error claro si nunca hubo tasa (RF-019a).
  - [ ] Resumen de gastos del mes (manuales y compras) en VES y USD.
  - [ ] Lista de ingredientes con existencia critica o agotada.

- [ ] **T034 - Implementar pantalla de perfil y cierre de sesion**
  - RF: RF-021, RF-022.
  - Diseno: `docs/design/examples/user profile.jpg`.
  - Hecho cuando: el perfil muestra los datos de la cuenta activa (nombre, usuario y rol) y cierra la sesion limpiando los tokens locales.
  - [ ] Vista de perfil con datos de `GET /auth/me`.
  - [ ] Boton de cerrar sesion que limpia tokens y vuelve al login.
  - Nota: editar nombre o contrasena queda fuera de alcance hasta definir un endpoint nuevo.

- [ ] **T035 - Implementar pantalla de ingredientes y formulario CRUD**
  - RF: RF-001 a RF-004.
  - Diseno: `docs/design/examples/ingredientes.png`, `inventory manager.jpg`, `invetory.png` y `Search.png`.
  - Hecho cuando: se pueden buscar, crear, editar, desactivar o eliminar ingredientes desde el movil con validaciones visibles.
  - [ ] Lista de ingredientes con buscador y filtro activo/inactivo.
  - [ ] Formulario crear/editar con nombre unico normalizado y unidad (RF-001, RF-001a, RF-002).
  - [ ] Acciones desactivar/eliminar con bloqueos del backend visibles (RF-003, RF-003a, RF-004).

- [ ] **T036 - Implementar gestion movil de categorias de gastos**
  - RF: RF-009a.
  - Diseno: `docs/design/mockup-gastos.html`.
  - Hecho cuando: el usuario crea, edita y elimina categorias desde la aplicacion.
  - [ ] Lista de categorias con creacion y edicion.
  - [ ] Eliminacion con mensaje cuando la categoria esta en uso.

- [ ] **T037 - Implementar formulario movil de compra de ingrediente**
  - RF: RF-005, RF-006, RF-009, RF-018.
  - Hecho cuando: el formulario muestra la conversion USD antes de confirmar y registra una compra exitosa.
  - [ ] Selector de ingrediente, cantidad, costo VES, tasa y fecha.
  - [ ] Vista previa de la conversion USD con la tasa elegida (RF-018).
  - [ ] Confirmacion de compra atomica y error de duplicado visible (RF-009).

- [ ] **T038 - Implementar consulta de inventario y salida manual movil**
  - RF: RF-010 a RF-015.
  - Diseno: `docs/design/mockup-inventario.html` y `docs/design/examples/inventory manager 2.jpg`.
  - Hecho cuando: se visualiza stock y se registra una salida con validacion de existencia insuficiente.
  - [ ] Lista de existencias por ingrediente con su unidad (RF-010).
  - [ ] Formulario de salida: ingrediente, cantidad, fecha y motivo (RF-011).
  - [ ] Rechazo visible por existencia insuficiente sin modificar lotes (RF-014).
  - [ ] Detalle de lotes consumidos FIFO con costo USD (RF-012, RF-013, RF-015).

- [ ] **T039 - Implementar gastos manuales y categorias en el movil**
  - RF: RF-007, RF-008, RF-018.
  - Diseno: `docs/design/mockup-gastos.html`.
  - Hecho cuando: se crea y consulta un gasto manual sin modificar inventario.
  - [ ] Formulario con descripcion, categoria, monto VES, tasa y pago.
  - [ ] Listado y detalle del gasto con snapshot historico (RF-007, RF-018, RF-020).

## Cierre

- [ ] **T040 - Ejecutar regresion completa y validar RF por RF**
  - RF: RF-001 a RF-022.
  - Hecho cuando: suites de backend y movil estan verdes y cada RF tiene una prueba enlazada en la validacion final.

- [ ] **T041 - Verificar los flujos en Android y documentar configuracion local**
  - RF: RF-001 a RF-022.
  - Hecho cuando: los flujos de login, ingredientes, compra, gasto y salida se prueban manualmente en Android y la configuracion necesaria queda documentada.
