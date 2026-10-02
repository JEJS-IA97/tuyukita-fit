import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

function loadEnvFile(): void {
  const envPath = path.resolve(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (match && process.env[match[1]] === undefined) {
      process.env[match[1]] = match[2];
    }
  }
}

const REQUIRED_COLLECTIONS = [
  'expense_categories',
  'inventory_lots',
  'inventory_movements',
  'inventory_lot_consumptions',
];

async function main(): Promise<void> {
  loadEnvFile();
  const prisma = new PrismaClient();
  const run = (command: Record<string, unknown>) =>
    (prisma as any).$runCommandRaw(command);

  const list = (await run({ listCollections: 1 })) as {
    cursor: { firstBatch: { name: string }[] };
  };
  const names = list.cursor.firstBatch.map((entry) => entry.name);

  const missing = REQUIRED_COLLECTIONS.filter((name) => !names.includes(name));
  console.log(
    `Colecciones requeridas: ${
      missing.length === 0 ? 'TODAS PRESENTES' : `FALTAN: ${missing.join(', ')}`
    }`,
  );

  const ingredientIndexes = (await run({
    listIndexes: 'ingredients',
  })) as { cursor: { firstBatch: { name: string; key: Record<string, unknown>; unique?: boolean }[] } };
  const normalizedIndex = ingredientIndexes.cursor.firstBatch.find(
    (index) => index.key['normalized_name'] !== undefined,
  );
  console.log(
    `Indice unico normalizedName en ingredients: ${
      normalizedIndex && normalizedIndex.unique ? 'OK' : 'FALTA'
    }`,
  );

  const users = await prisma.user.count();
  console.log(`Usuarios preservados: ${users}`);

  await prisma.$disconnect();

  if (missing.length > 0 || !normalizedIndex?.unique || users !== 3) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error('Error:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
