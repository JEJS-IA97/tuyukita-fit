# Spec 001 - Inventario de ingredientes y gastos

## Objetivo

Permitir a los socios de Yukita Fit registrar compras y gastos, controlar existencias de ingredientes con costeo FIFO y consultar valores en bolivares y dolares sin alterar el historial financiero.

## Alcance

Esta spec cubre ingredientes, compras de ingredientes, gastos, lotes de inventario, ajustes manuales de salida y tasas de cambio BCV y USDT.

## Requisitos funcionales

### Ingredientes

- **RF-001**: El sistema debera permitir a un usuario activo crear un ingrediente con nombre, unidad de medida y estado activo.
- **RF-001a**: El sistema debera impedir ingredientes duplicados comparando un nombre normalizado sin diferencias de mayusculas, minusculas ni espacios exteriores.
- **RF-002**: El sistema debera permitir actualizar los datos configurables de un ingrediente mientras se preserva su historial de compras, gastos y consumos.
- **RF-003**: Cuando un ingrediente tenga movimientos historicos, el sistema debera permitir desactivarlo en lugar de eliminarlo permanentemente.
- **RF-003a**: El sistema debera permitir eliminar permanentemente un ingrediente que no tenga movimientos historicos.
- **RF-004**: El sistema debera impedir cambiar la unidad de medida de un ingrediente con inventario o movimientos existentes hasta que exista una funcion de conversion de unidades.

### Compras y gastos

- **RF-005**: Cuando el usuario registre una compra de ingrediente, el sistema debera crear en una sola operacion un lote de inventario y un gasto vinculado.
- **RF-006**: La compra debera registrar ingrediente, cantidad, unidad, costo total en bolivares, fecha y la tasa de cambio elegida para convertirla a dolares.
- **RF-007**: Cada gasto debera registrar descripcion, categoria, monto en bolivares, equivalente historico en dolares, fuente de tasa, valor de tasa, fecha y usuario responsable.
- **RF-008**: El sistema debera permitir registrar gastos que no correspondan a una compra de ingrediente sin modificar existencias.
- **RF-009**: El sistema debera impedir que una compra vinculada genere un gasto duplicado para el mismo evento.
- **RF-009a**: El sistema debera permitir crear, actualizar y eliminar categorias de gastos.
- **RF-009b**: El sistema debera permitir corregir o eliminar compras, gastos y salidas; al hacerlo, debera revertir o recalcular sus efectos en inventario y costos sin dejar movimientos huerfanos.

### Inventario y FIFO

- **RF-010**: El sistema debera mostrar por ingrediente la existencia disponible en su unidad de medida.
- **RF-011**: Cuando el usuario registre un ajuste manual de salida, el sistema debera solicitar ingrediente, cantidad, fecha y motivo.
- **RF-012**: Cuando se confirme una salida, el sistema debera descontar existencias aplicando FIFO: primero las unidades disponibles de los lotes mas antiguos.
- **RF-012a**: Cuando dos lotes tengan la misma fecha de compra, el sistema debera consumir primero el que fue registrado antes.
- **RF-012b**: Cuando se cree, corrija o elimine un movimiento con fecha anterior a otros movimientos, el sistema debera recalcular FIFO en orden cronologico para conservar existencias y costos coherentes.
- **RF-013**: El sistema debera calcular y guardar el costo historico en dolares de cada salida a partir de los lotes FIFO consumidos.
- **RF-014**: Si la cantidad solicitada supera la existencia disponible, el sistema debera rechazar la salida y no modificar ningun lote.
- **RF-015**: El sistema debera permitir consultar el detalle de los lotes consumidos por cada salida para fines de auditoria.

### Tasas y conversiones

- **RF-016**: El sistema debera obtener automaticamente la tasa USD/VES BCV desde una fuente publica que refleje la tasa oficial y la tasa USDT/VES desde una fuente externa publica de referencia de mercado. El sistema no debera calcular ninguna de las dos tasas.
- **RF-017**: Cuando se consulte una tasa, el sistema debera identificar su tipo (`BCV` o `USDT`), fuente, fecha de vigencia y momento de consulta.
- **RF-018**: Cuando se cree una compra o gasto en bolivares, el sistema debera permitir seleccionar la tasa BCV o USDT disponible y guardar la tasa usada junto con el equivalente en dolares.
- **RF-019**: Cuando no exista una publicacion nueva de una tasa por fin de semana, feriado o dia no bancario, el sistema debera usar la ultima tasa vigente registrada.
- **RF-019a**: Si nunca se ha registrado una tasa valida para el tipo seleccionado, el sistema debera informar el problema y no crear un movimiento con conversion no verificable.
- **RF-020**: Los cambios posteriores de tasa no deberan alterar los montos en dolares ni los costos guardados en movimientos ya registrados.

### Acceso y trazabilidad

- **RF-021**: El sistema debera permitir a las cuentas activas iniciales de Jose, Jai y Vivi realizar por igual todas las operaciones de esta spec.
- **RF-022**: El sistema debera conservar el usuario, fecha de creacion y datos relevantes de cada compra, gasto, lote y ajuste de inventario.

## Reglas de negocio

- Un ingrediente usa una unica unidad de medida en esta primera version. Las conversiones entre unidades quedan fuera de alcance.
- Los montos se ingresan en bolivares y se calculan tambien en dolares con la tasa elegida en el momento del registro.
- Los montos, cantidades, costos y conversiones se redondean a dos decimales.
- Una compra de ingrediente representa un gasto al momento de comprar, aunque parte del lote permanezca en inventario.
- El costo atribuido a una salida de inventario corresponde solo a las existencias consumidas por FIFO.
- Los registros con historial no se eliminan fisicamente; se desactivan cuando dejan de usarse.
- Las categorias de gastos son datos configurables y no una lista fija en el codigo.

## Fuera de alcance

- Productos, sabores, recetas, empaques y cantidades por paquete.
- Ordenes, ventas, pagos de clientes, ganancias y reportes comerciales.
- Registro de produccion automatizado desde recetas.
- Conversiones entre unidades de medida.
- Modo oscuro y configuracion visual avanzada.
- Distribucion de APK y despliegue en Render.

## Criterios de finalizacion

- Se pueden crear, actualizar y desactivar ingredientes sin perder el historial.
- Una compra crea exactamente un gasto y un lote de inventario vinculados.
- Las salidas manuales consumen lotes en orden FIFO y no permiten inventario negativo.
- Todo gasto y compra conserva sus montos en VES y USD con la tasa y fuente historicas.
- La aplicacion muestra errores comprensibles cuando una tasa no esta disponible.
- Cada RF cuenta con una prueba automatizada en verde.
