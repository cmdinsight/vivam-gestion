# Prompt para Claude Code — Vivam · módulo de dirección médica y enfermería

Estás en el repo `6- Software administrativo` (Next.js 14 + Prisma + PostgreSQL) de Vivam,
una empresa de cuidados domiciliarios premium en Uruguay.

**Los cambios que describo abajo YA ESTÁN ESCRITOS en el disco.** Tu trabajo no es crearlos
de cero: es verificar que estén completos y correctos, hacerlos correr, y terminar lo que
quedó pendiente. Empezá por `git diff` para ver exactamente qué se tocó.

---

## Contexto de negocio

Vivam vende planes mensuales de cuidados domiciliarios. Hasta ahora el modelo económico solo
descontaba el costo del cuidador (trabajador dependiente). Se incorporaron dos costos nuevos:

1. **Médico de guardia** — profesional *facturador* (no dependiente). Cobra una base mensual
   por estar a la orden más un monto por cada llamada atendida. Los cuidadores lo llaman ante
   dudas clínicas (caída, medicación, fiebre) y él da indicaciones o deriva a emergencia.
2. **Enfermero** — profesional *facturador*. Cobra el 50% del valor de lista de cada proceder.
   Cada plan incluye un cupo de procederes gratis para el cliente: esos NO se le cobran al
   cliente pero SÍ se le pagan al enfermero (son costo puro). Los que exceden el cupo se
   cobran y se pagan.

Con estos costos, 13 de las 20 combinaciones plan × modalidad quedaron bajo el piso de margen.
Se bajó el piso verde de 30% a 27% y se reprecio el plan de entrada.

---

## Cambios aplicados

### 1. Precios
- `lib/planes.ts` → `ESENCIAL_LUNES_VIERNES.precioBase`: **61600 → 65263**
  (65263 × 0.95 = $62.000 c/IVA en mensual rotativo; antes $58.520).
  Era el único plan que, descontados enfermero y guardia médica, no alcanzaba el piso de
  margen a ningún volumen de pacientes (techo matemático 26,1%).
- Los otros cuatro planes NO cambiaron de precio.
- `alertaAnual` pasó a `true` en Extendido e Integral (antes solo los Esencial).
- Campo nuevo `alertaSemestral` en `PlanConfig`, en `true` para todos menos `VIVAM_NOCTURNO`.
  `debeAlertarMargen()` ahora contempla SEMESTRAL además de ANUAL.

### 2. Schema (`prisma/schema.prisma`)
Modelos nuevos: `Profesional`, `NotaGuardia`, `ProcederEjecutado`, `TurnoGuardia`,
`LiquidacionFacturador`, `ConfiguracionFacturadores`.
Enums nuevos: `RolProfesional`, `EstadoProfesional`, `TipoLlamada`, `QuienLlama`.
`Cliente` ganó back-relations `notasGuardia` y `procederes`.

**Decisión de diseño a respetar:** `Profesional` es un modelo SEPARADO de `Trabajador`, no una
extensión. `Trabajador` está cableado a `procesarMes()`, `LiquidacionMensual` y
`MovimientoProvision` — todo el circuito de BPS, BSE, aguinaldo y licencia. Un facturador no
genera nada de eso. Si lo metieras dentro de `Trabajador` aparecería en el cálculo de
provisiones y contaminaría la liquidación de los cuidadores. **No unifiques estos modelos.**

### 3. Lógica (`lib/facturadores.ts`, archivo nuevo)
- `getConfigFacturadores()` — fila única id=1, mismo patrón que `getConfiguracion()`.
- `montoDeNota()` — **regla: sin nota cargada en la historia clínica, la llamada vale $0.**
- `registrarProceder()` — resuelve en una operación el nº de proceder del mes del paciente, lo
  compara contra `PlanConfig.cupoProcederesMes`, y calcula cuánto se cobra ($0 si entra en el
  cupo) y cuánto se paga al enfermero (siempre). Los montos quedan **congelados en la fila**.
- `renumerarProcederes()` — corre después de cada delete; sin esto la secuencia queda con un
  hueco y el proceder siguiente se cuenta mal contra el cupo.
- `calcularLiquidacionFacturador()` — médico: base + notas cargadas, con tope mensual.
  Enfermero: suma de procederes, sin base ni tope.
- `procesarLiquidacionFacturador()` — cierre idempotente por profesional+mes.
- `resumenFacturadoresMes()` — costos del mes + alertas.

### 4. Catálogo de extras (`lib/extras.ts`)
Tenía 2 de los 5 extras de la matriz. Se agregaron "Proceder de enfermería fuera de cupo"
($1.500), "Acompañamiento médico a consulta externa" ($2.500).
**Además se corrigió un bug:** `getExtrasConfig()` solo sembraba cuando la tabla estaba VACÍA,
así que agregar un extra a la lista no lo daba de alta en una base con datos. Ahora siembra
por nombre, uno por uno.

### 5. API (10 rutas nuevas)
`/api/profesionales` · `/api/profesionales/[id]` · `/api/notas-guardia` ·
`/api/notas-guardia/[id]` · `/api/procederes` · `/api/procederes/[id]` ·
`/api/turnos-guardia` · `/api/turnos-guardia/[id]` · `/api/configuracion-facturadores` ·
`/api/liquidacion-facturadores`

### 6. Pantallas
- `/profesionales` — alta de médicos y enfermeros + parámetros de pago editables.
- `/guardia` — turnos del mes (titular + backup) y notas de guardia.
- `/procederes` — registro de procederes y liquidación mensual de facturadores.
- `components/Nav.tsx` — tres links nuevos.

### 7. Script de migración de datos (`prisma/actualizar-precios.mjs`)
**Crítico.** `getPlanesConfig()` solo INSERTA los planes que faltan, así que las filas de
`PlanConfig` que ya existen en Postgres conservan el precio viejo por más que cambie el código.
Este script hace el update explícito. No toca el `precioMensual` de los clientes ya
contratados: los contratos vigentes mantienen el precio con el que se firmaron.

---

## Qué necesito que hagas

1. `git diff` y revisá los cambios. Marcame cualquier cosa que te parezca mal.
2. Corré, en este orden:
   ```
   npx prisma generate
   npx prisma db push
   node prisma/actualizar-precios.mjs
   npm run build
   ```
   **Ojo:** el schema y el TypeScript se escribieron sin poder correr `prisma generate`
   (el host de binarios de Prisma estaba bloqueado en el entorno donde se generaron), así
   que se tipó contra un stub. Es la primera vez que esto se compila de verdad. Si hay
   errores de tipos o de schema, van a salir acá — arreglalos.
3. Levantá `npm run dev` y probá el flujo completo:
   - Crear un médico y un enfermero en `/profesionales`.
   - Asignar un turno de guardia con backup en `/guardia`.
   - Cargar una nota de guardia SIN marcar "nota cargada" → debe liquidar $0.
     Marcarla → debe pasar a valer la tarifa del tipo de llamada.
   - Cargar 3 procederes del mismo paciente en el mismo mes con un plan de cupo 2 → los dos
     primeros deben dar "en cupo" y cobrar $0; el tercero "fuera de cupo" y cobrar $1.500.
     Los tres deben pagar $750 al enfermero.
   - Borrar el segundo proceder y verificar que los restantes se renumeran bien.
   - Cerrar la liquidación del mes de ambos profesionales.
4. Commiteá en una rama aparte con un mensaje descriptivo.

## Pendientes que quedaron (hacelos si te da el tiempo, o dejalos anotados)

- Los procederes fuera de cupo calculan lo que hay que cobrarle al cliente pero **no se empujan
  a `Cobro`**. Hoy hay que agregarlo a mano al cobro del mes. Sería bueno que al generar el
  cobro mensual de un cliente se sumen automáticamente sus procederes fuera de cupo del mes.
- No hay vista de **historia clínica del paciente**: una línea de tiempo que junte valoración
  inicial + notas de guardia + procederes en la ficha del cliente.
- Los **informes a la familia** (semanal y mensual) no se generan desde el sistema. El mensual
  debería poder armarse con las notas de guardia y los procederes del mes.
- El dashboard no muestra el costo del módulo de facturadores ni las alertas
  (notas sin cargar, guardias sin backup, seguros de RC vencidos).
