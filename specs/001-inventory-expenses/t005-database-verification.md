# T005 - Verificacion de base de datos de desarrollo

Fecha: 2026-10-02
RF: soporte para RF-005, RF-009b y RF-012b (transacciones y respaldo previo al esquema).

## Comando reproducible

```
cd backend
pnpm db:verify
```

Script: `backend/scripts/verify-database.ts` (usa `DATABASE_URL` de `backend/.env`; no imprime credenciales).

## Respaldo realizado

- Host: `cluster0.hzcqvaf.mongodb.net` (Atlas, base de datos `yukita-fit`).
- Destino: `backend/backups/2026-10-02T00-42-06-048Z-dev/` (22 colecciones en JSON + `manifest.json`). La carpeta esta en `.gitignore` porque contiene datos de usuarios (hashes).
- Contenido: 7 documentos en total.

| Coleccion | Documentos |
|---|---|
| users | 3 (jose, jay, vivi) |
| refresh_tokens | 4 |
| demas 20 colecciones | 0 |

No habia datos historicos de negocio (ventas, gastos, inventario, tasas); solo las 3 cuentas iniciales con sus sesiones.

## Soporte de transacciones

- Transaccion interactiva de Prisma (`$transaction`): **abierta con exito**.
- Prueba de rollback: se creo un usuario de prueba dentro de la transaccion y se revertio con un error controlado; despues se verifico que el usuario **no existia** en la base de datos.
- Resultado: **el entorno (Atlas replica set) admite transacciones multi-documento con rollback verificado**.

## Conclusion

El entorno de desarrollo cumple lo pedido por T005 antes de aplicar el esquema de la spec 001:

1. Existe un respaldo local recuperable de todos los datos actuales.
2. Las atomicidades exigidas por RF-005 (compra = gasto + lote) y los recalculos de RF-009b/RF-012b son viables con transacciones de Prisma.

Nota: repetir `pnpm db:verify` (respaldo) justo antes de aplicar el esquema en T010.
