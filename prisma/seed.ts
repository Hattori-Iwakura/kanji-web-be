import { PrismaClient } from "../generated/prisma";
import { Hasher } from '../src/shared/utils'

const prisma = new PrismaClient();

async function adminCreate() {
  const admin = await prisma.users.upsert({
    where: { account: "admin" },
    update: { is_system: true },
    create: {
      account: "admin",
      hash_password: await Hasher.hash("123456"),
      is_system: true,
      is_first_login: false,
      is_active: true,
      email: "admin@gmail.com"
    }
  });
}


async function main() {
  // Seed admin user
  await adminCreate();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });