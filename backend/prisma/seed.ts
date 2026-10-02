import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}`,
    );
  }

  return value;
}

async function createInitialAdmin(
  username: string,
  passwordHash: string,
) {
  const normalizedUsername = username
    .trim()
    .toLowerCase();

  const existingUser =
    await prisma.user.findUnique({
      where: {
        username: normalizedUsername,
      },
    });

  if (!existingUser) {
    const user = await prisma.user.create({
      data: {
        username: normalizedUsername,
        name: normalizedUsername,
        passwordHash,
        role: 'ADMIN',
        isActive: true,
      },
    });

    console.log(
      `Created initial admin: ${user.username}`,
    );

    return;
  }

  await prisma.user.update({
    where: {
      id: existingUser.id,
    },
    data: {
      role: 'ADMIN',
      isActive: true,
      passwordHash,
    },
  });

  console.log(
    `Verified initial admin: ${normalizedUsername}`,
  );
}

async function main() {
  const admin1 = requiredEnv(
    'INITIAL_ADMIN_1_USER',
  );

  const admin2 = requiredEnv(
    'INITIAL_ADMIN_2_USER',
  );

  const admin3 = requiredEnv(
    'INITIAL_ADMIN_3_USER',
  );

  const initialPassword = requiredEnv(
    'INITIAL_ADMIN_PASSWORD',
  );

  const passwordHash =
    await argon2.hash(initialPassword);

  await createInitialAdmin(
    admin1,
    passwordHash,
  );

  await createInitialAdmin(
    admin2,
    passwordHash,
  );

  await createInitialAdmin(
    admin3,
    passwordHash,
  );

  console.log(
    'Initial administrators configured successfully.',
  );
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });