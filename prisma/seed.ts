import { PrismaClient } from '../generated/prisma';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');
  
  // Create main admin account
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@kanji.app' },
    update: {},
    create: {
      email: 'admin@kanji.app',
      passwordHash: adminPassword,
      name: 'Admin',
      role: 'ADMIN',
    },
  });
  console.log('Admin user created:', admin.email);
  
  // Create test admin account for integration tests
  const testAdminPassword = await bcrypt.hash('Admin@123456', 10);
  const testAdmin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      passwordHash: testAdminPassword,
      name: 'Test Admin',
      role: 'ADMIN',
    },
  });
  console.log('Test admin user created:', testAdmin.email);
  
  const kanjiData = [
    { character: '一', meanings: 'one', onyomi: 'イチ、イツ', kunyomi: 'ひと.つ', jlpt: 5, grade: 1, strokeCount: 1, frequency: 1 },
    { character: '二', meanings: 'two', onyomi: 'ニ', kunyomi: 'ふた.つ', jlpt: 5, grade: 1, strokeCount: 2, frequency: 9 },
    { character: '三', meanings: 'three', onyomi: 'サン', kunyomi: 'み.つ', jlpt: 5, grade: 1, strokeCount: 3, frequency: 11 },
    { character: '日', meanings: 'day, sun, Japan', onyomi: 'ニチ、ジツ', kunyomi: 'ひ、か', jlpt: 5, grade: 1, strokeCount: 4, frequency: 2 },
    { character: '月', meanings: 'month, moon', onyomi: 'ゲツ、ガツ', kunyomi: 'つき', jlpt: 5, grade: 1, strokeCount: 4, frequency: 12 },
  ];
  
  for (const k of kanjiData) {
    await prisma.kanji.upsert({
      where: { character: k.character },
      update: {},
      create: k,
    });
  }
  console.log('Kanji created:', kanjiData.length);
  
  // Create system JLPT lists
  const jlptLevels = [5, 4, 3, 2, 1];
  for (const level of jlptLevels) {
    const listName = `JLPT N${level} Kanji`;
    const existingList = await prisma.kanjiList.findFirst({
      where: { name: listName },
    });
    
    if (!existingList) {
      // Get all kanji for this JLPT level
      const jlptKanji = await prisma.kanji.findMany({
        where: { jlpt: level },
        orderBy: { frequency: 'asc' },
      });
      
      const list = await prisma.kanjiList.create({
        data: {
          name: listName,
          description: `Official JLPT N${level} kanji list`,
          userId: null, // System list (no owner)
          isPublic: true,
          items: {
            create: jlptKanji.map((k, index) => ({
              kanjiId: k.id,
              order: index,
            })),
          },
        },
      });
      console.log(`Created system list: ${listName} (${jlptKanji.length} kanji)`);
    } else {
      console.log(`System list already exists: ${listName}`);
    }
  }
  
  console.log('Seeding completed!');
}

main()
  .catch((e) => { console.error('Seeding failed:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
