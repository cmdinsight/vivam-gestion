/**
 * Sincroniza PlanConfig y ConfiguracionFacturadores con los valores de la
 * Matriz Maestra (actualizada el 26/ago/2026).
 *
 * POR QUÉ HACE FALTA: getPlanesConfig() en lib/planes.ts solo INSERTA los
 * planes que faltan. Si la app ya corrió alguna vez, las filas de PlanConfig
 * existen con los precios viejos y cambiar DEFAULTS_PLAN en el código no las
 * toca. Este script hace el update explícito.
 *
 * Uso:  node prisma/actualizar-precios.mjs
 * (necesita DATABASE_URL en el entorno, igual que la app)
 *
 * No toca el precioMensual de los clientes ya contratados: los contratos
 * vigentes mantienen el precio con el que se firmaron.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const PLANES = {
  ESENCIAL_LUNES_VIERNES: { horasMes: 160, precioBase: 65263, costoCuidadorMes: 36800, cupoProcederesMes: 2, alertaAnual: true, alertaSemestral: true },
  ESENCIAL_COMPLETO:      { horasMes: 240, precioBase: 92400, costoCuidadorMes: 55200, cupoProcederesMes: 2, alertaAnual: true, alertaSemestral: true },
  EXTENDIDO:              { horasMes: 480, precioBase: 184800, costoCuidadorMes: 110400, cupoProcederesMes: 5, alertaAnual: true, alertaSemestral: true },
  INTEGRAL:               { horasMes: 720, precioBase: 304920, costoCuidadorMes: 175920, cupoProcederesMes: 10, alertaAnual: true, alertaSemestral: true },
  VIVAM_NOCTURNO:         { horasMes: 240, precioBase: 120120, costoCuidadorMes: 65520, cupoProcederesMes: 2, alertaAnual: false, alertaSemestral: false },
};

const FACTURADORES = {
  baseMensualMedico: 8000,
  tarifaProgramada: 400,
  tarifaGuardia: 700,
  tarifaEmergencia: 1200,
  topeMensualMedico: 25000,
  pctEnfermero: 50,
  precioProcederSinIva: 1500,
};

async function main() {
  console.log("Sincronizando planes…\n");
  for (const [plan, datos] of Object.entries(PLANES)) {
    const antes = await prisma.planConfig.findUnique({ where: { plan } });
    await prisma.planConfig.upsert({ where: { plan }, create: { plan, ...datos }, update: datos });
    const mensual = Math.round(datos.precioBase * 0.95);
    if (antes && Number(antes.precioBase) !== datos.precioBase) {
      const mensualAntes = Math.round(Number(antes.precioBase) * 0.95);
      console.log(`  ${plan}: precioBase ${antes.precioBase} -> ${datos.precioBase}  (mensual rotativo ${mensualAntes} -> ${mensual})`);
    } else {
      console.log(`  ${plan}: sin cambios (mensual rotativo ${mensual})`);
    }
  }

  console.log("\nSincronizando configuración de facturadores…");
  await prisma.configuracionFacturadores.upsert({
    where: { id: 1 },
    create: { id: 1, ...FACTURADORES },
    update: FACTURADORES,
  });
  console.log("  OK");

  const clientes = await prisma.cliente.count({ where: { estado: "ACTIVO" } });
  console.log(`\nListo. Los ${clientes} cliente(s) activos conservan el precio con el que firmaron.`);
  console.log("Si querés repreciar alguno, editalo desde la pantalla de Clientes.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
