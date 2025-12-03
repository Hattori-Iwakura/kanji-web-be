/* eslint-disable @typescript-eslint/no-unused-vars */
import { PrismaClient } from '../generated/prisma';
import { Hasher } from '../src/shared/utils';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function adminCreate() {
  const admin = await prisma.users.upsert({
    where: { account: 'admin' },
    update: { is_system: true },
    create: {
      account: 'admin',
      hash_password: await Hasher.hash('123456'),
      is_system: true,
      is_first_login: false,
      is_active: true,
      email: 'admin@gmail.com',
    },
  });
}

async function kanjiSeed() {
  console.log('🌱 Bắt đầu seed kanji từ file JSON...');

  // Đọc file JSON
  const jsonPath = path.join(__dirname, 'data', 'kanji-merged.json');
  const rawData = fs.readFileSync(jsonPath, 'utf-8');
  const kanjiData = JSON.parse(rawData);

  const kanjiEntries = Object.entries(kanjiData);
  const LIMIT = 2500; // Giới hạn 2500 kanji - bao gồm toàn bộ JLPT N5-N1 + Jōyō Kanji
  
  console.log(`📊 Tổng số kanji trong file: ${kanjiEntries.length}`);
  console.log(`📦 Sẽ seed ${Math.min(LIMIT, kanjiEntries.length)} kanji phổ biến nhất...`);
  console.log(`💡 Đủ cho JLPT N5-N1 và sử dụng hàng ngày`);

  let inserted = 0;
  
  for (let i = 0; i < Math.min(LIMIT, kanjiEntries.length); i++) {
    const [character, data] = kanjiEntries[i] as [string, any];
    
    try {
      // Chuyển đổi readings từ array sang string
      const onyomi = data.readings_on?.join(', ') || null;
      const kunyomi = data.readings_kun?.join(', ') || null;
      const meanings = data.meanings?.join(', ') || 'No meaning';
      const radicals = data.wk_radicals?.join(', ') || null;

      await prisma.kanji.upsert({
        where: { character },
        update: {},
        create: {
          character,
          onyomi,
          kunyomi,
          meanings,
          stroke_count: data.strokes || null,
          jlpt: data.jlpt_new || data.jlpt_old || null,
          grade: data.grade || null,
          frequency: data.freq || null,
          radicals,
        },
      });

      inserted++;
      if (inserted % 50 === 0) {
        console.log(`✓ Đã seed ${inserted}/${LIMIT} kanji...`);
      }
    } catch (error: any) {
      console.error(`❌ Lỗi khi seed kanji "${character}":`, error.message);
    }
  }

  console.log(`✅ Seed Kanji hoàn tất! Tổng: ${inserted} chữ kanji`);
}

async function main() {
  console.log('🚀 Bắt đầu seed database...\n');
  
  // Seed admin user
  console.log('👤 Tạo admin user...');
  await adminCreate();
  console.log('✅ Admin user đã tạo\n');
  
  // Seed kanji
  await kanjiSeed();
  
  console.log('\n🎉 Seed hoàn tất!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
