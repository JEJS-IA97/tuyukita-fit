import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

function loadEnvFile(): void {
  const envPath = path.resolve(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (match && process.env[match[1]] === undefined) {
      process.env[match[1]] = match[2];
    }
  }
}

function hostLabel(): string {
  const url = process.env.DATABASE_URL ?? '';
  const match = url.match(/@([^/?]+)/);
  return match ? match[1] : 'desconocido';
}

async function backupCollections(
  prisma: PrismaClient,
  backupDir: string,
): Promise<{ name: string; documents: number }[]> {
  const listResult = (await (prisma as any).$runCommandRaw({
    listCollections: 1,
  })) as { cursor: { firstBatch: { name: string; type?: string }[] } };

  const collections = listResult.cursor.firstBatch.filter(
    (entry) => entry.type !== 'view',
  );

  const summary: { name: string; documents: number }[] = [];

  for (const collection of collections) {
    const aggregateResult = (await (prisma as any).$runCommandRaw({
      aggregate: collection.name,
      pipeline: [],
      cursor: {},
    })) as { cursor: { firstBatch: unknown[] } };

    const documents = aggregateResult.cursor.firstBatch;
    fs.writeFileSync(
      path.join(backupDir, `${collection.name}.json`),
      JSON.stringify(documents, null, 2),
      'utf8',
    );
    summary.push({ name: collection.name, documents: documents.length });
  }

  return summary;
}

async function checkTransactions(prisma: PrismaClient): Promise<{
  supported: boolean;
  rolledBack: boolean;
  reason: string;
}> {
  const username = `t005-rollback-check-${Date.now()}`;
  const sentinel = 'T005_ROLLBACK_SENTINEL';
  let sentinelCaught = false;

  try {
    await prisma.$transaction(async (tx) => {
      await tx.user.create({
        data: {
          name: 'T005 rollback check',
          username,
          passwordHash: 'rollback-check-not-a-real-hash',
          role: 'OPERATOR',
        },
      });
      throw new Error(sentinel);
    });
  } catch (error) {
    if (error instanceof Error && error.message === sentinel) {
      sentinelCaught = true;
    } else {
      return {
        supported: false,
        rolledBack: false,
        reason: error instanceof Error ? error.message : String(error),
      };
    }
  }

  const leaked = await prisma.user.findUnique({ where: { username } });

  return {
    supported: sentinelCaught,
    rolledBack: sentinelCaught && leaked === null,
    reason: sentinelCaught
      ? 'transaccion interactiva abierta, escrita y revertida'
      : 'la transaccion no se abrio',
  };
}

async function main(): Promise<void> {
  loadEnvFile();

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL no esta configurada en backend/.env');
  }

  const prisma = new PrismaClient();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.resolve(
    __dirname,
    '..',
    'backups',
    `${timestamp}-dev`,
  );
  fs.mkdirSync(backupDir, { recursive: true });

  console.log(`Respaldo de base de datos de desarrollo`);
  console.log(`- Destino: ${path.relative(process.cwd(), backupDir)}`);
  console.log(`- Host: ${hostLabel()}`);

  const summary = await backupCollections(prisma, backupDir);
  const totalDocuments = summary.reduce((acc, item) => acc + item.documents, 0);

  const manifest = {
    takenAt: new Date().toISOString(),
    host: hostLabel(),
    totalDocuments,
    collections: summary,
  };
  fs.writeFileSync(
    path.join(backupDir, 'manifest.json'),
    JSON.stringify(manifest, null, 2),
    'utf8',
  );

  console.log(`- Colecciones: ${summary.length}, documentos: ${totalDocuments}`);
  for (const item of summary) {
    console.log(`    ${item.name}: ${item.documents}`);
  }

  console.log(`Verificacion de transacciones...`);
  const transactions = await checkTransactions(prisma);
  console.log(
    `- Soporta transacciones: ${transactions.supported ? 'SI' : 'NO'}` +
      ` (rollback verificado: ${transactions.rolledBack ? 'SI' : 'NO'})` +
      ` - ${transactions.reason}`,
  );

  await prisma.$disconnect();

  if (!transactions.supported || !transactions.rolledBack) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error('Error:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
