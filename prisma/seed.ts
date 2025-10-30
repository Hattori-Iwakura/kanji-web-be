import { PrismaClient } from '../generated/prisma';
import * as bcrypt from 'bcryptjs';
import * as fs from 'fs';
import * as path from 'path';

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
  
  // Create requested admin account
  const requestedAdminPassword = await bcrypt.hash('Admin@12345', 10);
  const requestedAdmin = await prisma.user.upsert({
    where: { email: 'admin@gmail.com' },
    update: {
      role: 'ADMIN',
      passwordHash: requestedAdminPassword,
    },
    create: {
      email: 'admin@gmail.com',
      passwordHash: requestedAdminPassword,
      name: 'System Admin',
      role: 'ADMIN',
    },
  });
  console.log('Requested admin user created:', requestedAdmin.email);
  
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
  
  // Load and import kanji data from JSON file
  console.log('Loading kanji data from JSON file...');
  const kanjiJsonPath = path.join(__dirname, 'data', 'kanji-merged.json');
  const kanjiJsonData = JSON.parse(fs.readFileSync(kanjiJsonPath, 'utf-8'));
  
  const kanjiEntries = Object.entries(kanjiJsonData);
  console.log(`Found ${kanjiEntries.length} kanji in JSON file`);
  
  // Define mandatory kanji for integration tests
  const mandatoryKanji = ['日', '月', '水', '火', '木', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
  console.log(`Mandatory test kanji: ${mandatoryKanji.join(', ')}`);
  
  // Separate mandatory and remaining kanji
  const selectedKanji: Array<[string, any]> = [];
  const kanjiByJlpt: { [key: number]: Array<[string, any]> } = {
    5: [],
    4: [],
    3: [],
    2: [],
    1: [],
  };
  
  // First, add all mandatory kanji
  for (const [character, data] of kanjiEntries as Array<[string, any]>) {
    if (mandatoryKanji.includes(character)) {
      selectedKanji.push([character, data]);
    } else {
      // Group remaining kanji by JLPT level for random selection
      const jlpt = data.jlpt_new || data.jlpt_old;
      if (jlpt && jlpt >= 1 && jlpt <= 5) {
        kanjiByJlpt[jlpt].push([character, data]);
      }
    }
  }
  console.log(`✓ Added ${selectedKanji.length} mandatory kanji`);
  
  // Calculate how many more kanji to add (target: 100 total)
  const targetTotal = 100;
  const remaining = targetTotal - selectedKanji.length;
  const perLevel = Math.floor(remaining / 5); // Distribute evenly across JLPT levels
  
  console.log(`Selecting ${remaining} additional random kanji (${perLevel} per JLPT level)...`);
  
  // Select random kanji from each level
  for (const level of [5, 4, 3, 2, 1]) {
    const levelKanji = kanjiByJlpt[level];
    console.log(`  N${level}: ${levelKanji.length} available kanji`);
    
    // Shuffle and take the calculated amount
    const shuffled = levelKanji.sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, perLevel);
    selectedKanji.push(...selected);
    console.log(`  → Selected ${selected.length} random kanji from N${level}`);
  }
  
  console.log(`Total kanji to import: ${selectedKanji.length}`);
  
  let importedCount = 0;
  let batchSize = 20;
  
  for (let i = 0; i < selectedKanji.length; i += batchSize) {
    const batch = selectedKanji.slice(i, i + batchSize);
    
    await prisma.$transaction(
      batch.map(([character, data]: [string, any]) => {
        return prisma.kanji.upsert({
          where: { character },
          update: {},
          create: {
            character,
            meanings: Array.isArray(data.meanings) ? data.meanings.join(', ') : '',
            onyomi: Array.isArray(data.readings_on) ? data.readings_on.join('、') : '',
            kunyomi: Array.isArray(data.readings_kun) ? data.readings_kun.join('、') : '',
            jlpt: data.jlpt_new || data.jlpt_old || null,
            grade: data.grade || null,
            strokeCount: data.strokes || 0,
            frequency: data.freq || null,
          },
        });
      })
    );
    
    importedCount += batch.length;
    console.log(`  Imported ${importedCount}/${selectedKanji.length} kanji...`);
  }
  
  console.log(`✓ Successfully imported ${importedCount} kanji`);
  
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
  
  // Create test user account
  const testUserPassword = await bcrypt.hash('User@123456', 10);
  const testUser = await prisma.user.upsert({
    where: { email: 'nhatnsm1225@gmail.com' },
    update: {},
    create: {
      email: 'nhatnsm1225@gmail.com',
      passwordHash: testUserPassword,
      name: 'Hattori Iwakura',
      role: 'USER',
    },
  });
  console.log('Test user created:', testUser.email);

  // Create flashcard decks with cards for study session testing
  console.log('Creating flashcard decks...');
  
  // Deck 1: JLPT N5 Basic Numbers (30 cards - more for testing)
  const n5NumberKanji = await prisma.kanji.findMany({
    where: {
      jlpt: 5,
    },
    take: 30,
    orderBy: { frequency: 'asc' },
  });
  
  if (n5NumberKanji.length > 0) {
    const deck1 = await prisma.flashcardDeck.upsert({
      where: { id: 1 },
      update: {},
      create: {
        name: 'JLPT N5 - Numbers',
        description: 'Basic Japanese numbers (1-10)',
        userId: testUser.id,
        isPublic: false,
        cards: {
          create: n5NumberKanji.map((kanji) => ({
            kanjiId: kanji.id,
            front: kanji.character,
            back: kanji.meanings,
            easinessFactor: 2.5,
            interval: 0,
            repetitions: 0,
            nextReviewAt: new Date(),
          })),
        },
      },
    });
    console.log(`✓ Created deck: ${deck1.name} (${n5NumberKanji.length} cards)`);
  }
  
  // Deck 2: JLPT N5 Days (7 cards)
  const n5DayKanji = await prisma.kanji.findMany({
    where: {
      character: { in: ['日', '月', '火', '水', '木', '金', '土'] },
    },
  });
  
  if (n5DayKanji.length > 0) {
    const deck2 = await prisma.flashcardDeck.upsert({
      where: { id: 2 },
      update: {},
      create: {
        name: 'JLPT N5 - Days of Week',
        description: 'Kanji for days of the week',
        userId: testUser.id,
        isPublic: false,
        cards: {
          create: n5DayKanji.map((kanji, index) => {
            // Set different review states for testing
            const now = new Date();
            let nextReviewAt = new Date(now);
            let interval = 0;
            let repetitions = 0;
            
            if (index < 2) {
              // 2 cards due now
              nextReviewAt = new Date(now.getTime() - 1000 * 60 * 60); // 1 hour ago
            } else if (index < 5) {
              // 3 cards for tomorrow
              nextReviewAt = new Date(now.getTime() + 1000 * 60 * 60 * 24); // tomorrow
              interval = 1;
              repetitions = 1;
            } else {
              // 2 cards for next week
              nextReviewAt = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 7); // next week
              interval = 7;
              repetitions = 2;
            }
            
            return {
              kanjiId: kanji.id,
              front: kanji.character,
              back: kanji.meanings,
              easinessFactor: 2.5,
              interval,
              repetitions,
              nextReviewAt,
            };
          }),
        },
      },
    });
    console.log(`✓ Created deck: ${deck2.name} (${n5DayKanji.length} cards)`);
  }
  
  // Deck 3: JLPT N5 Common Kanji (20 random N5 kanji)
  const n5CommonKanji = await prisma.kanji.findMany({
    where: { jlpt: 5 },
    take: 20,
    orderBy: { frequency: 'asc' },
  });
  
  if (n5CommonKanji.length > 0) {
    const deck3 = await prisma.flashcardDeck.upsert({
      where: { id: 3 },
      update: {},
      create: {
        name: 'JLPT N5 - Common Kanji',
        description: 'Most frequently used N5 kanji',
        userId: testUser.id,
        isPublic: true, // Make this one public
        cards: {
          create: n5CommonKanji.map((kanji, index) => {
            // Mix of new and review cards
            const now = new Date();
            let nextReviewAt = new Date(now);
            let interval = 0;
            let repetitions = 0;
            
            if (index % 3 === 0) {
              // Every 3rd card is due
              nextReviewAt = new Date(now.getTime() - 1000 * 60 * 60 * 2); // 2 hours ago
              interval = Math.floor(Math.random() * 5) + 1;
              repetitions = Math.floor(Math.random() * 3) + 1;
            } else {
              // Others are new or scheduled
              nextReviewAt = new Date(now.getTime() + 1000 * 60 * 60 * 24 * Math.random() * 10);
              interval = Math.floor(Math.random() * 10);
              repetitions = Math.floor(Math.random() * 5);
            }
            
            return {
              kanjiId: kanji.id,
              front: kanji.character,
              back: kanji.meanings,
              easinessFactor: 2.5,
              interval,
              repetitions,
              nextReviewAt,
            };
          }),
        },
      },
    });
    console.log(`✓ Created deck: ${deck3.name} (${n5CommonKanji.length} cards)`);
  }
  
  console.log('Seeding completed!');
}

main()
  .catch((e) => { console.error('Seeding failed:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
