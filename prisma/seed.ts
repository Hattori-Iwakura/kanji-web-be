/* eslint-disable @typescript-eslint/no-unused-vars */
import { PrismaClient } from '../generated/prisma';
import { Hasher } from '../src/shared/utils';

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
  console.log('🌱 Bắt đầu seed 500 chữ kanji...');

  // Danh sách một số chữ kanji thật để làm mẫu
  const sampleKanji = [
    '日', '月', '火', '水', '木', '金', '土', '年', '時', '分',
    '人', '男', '女', '子', '学', '生', '先', '私', '友', '母',
    '父', '兄', '姉', '弟', '妹', '家', '国', '語', '文', '字',
    '本', '書', '読', '話', '聞', '見', '食', '飲', '行', '来',
    '出', '入', '上', '下', '中', '外', '前', '後', '左', '右',
    '大', '小', '高', '低', '長', '短', '新', '古', '多', '少',
    '一', '二', '三', '四', '五', '六', '七', '八', '九', '十',
    '百', '千', '万', '円', '店', '買', '売', '物', '品', '車',
    '電', '気', '力', '海', '山', '川', '雨', '雪', '天', '空',
    '赤', '青', '白', '黒', '色', '花', '草', '木', '林', '森',
  ];

  const onyomiSamples = ['セイ', 'ニチ', 'ガク', 'シン', 'ジン', 'カイ', 'コク', 'ゴ', 'ブン', 'ホン'];
  const kunyomiSamples = ['ひと', 'やま', 'うみ', 'かわ', 'そら', 'はな', 'き', 'みず', 'ひ', 'つき'];
  const meaningGroups = [
    ['person', 'human'], ['mountain', 'peak'], ['sea', 'ocean'], ['river', 'stream'],
    ['sky', 'heaven'], ['flower', 'blossom'], ['tree', 'wood'], ['water', 'fluid'],
    ['sun', 'day'], ['moon', 'month'], ['fire'], ['wind'], ['earth', 'soil'],
    ['learn', 'study'], ['read', 'reading'], ['write', 'writing'], ['speak', 'talk'],
    ['listen', 'hear'], ['see', 'look'], ['eat', 'food'], ['drink', 'beverage'],
  ];
  const radicalSamples = ['人', '木', '水', '火', '土', '日', '月', '山', '川', '心'];

  let inserted = 0;
  
  // Tạo 500 chữ kanji, chia đều cho 5 cấp độ JLPT
  for (let jlptLevel = 5; jlptLevel >= 1; jlptLevel--) {
    const kanjiPerLevel = 100;
    
    for (let i = 0; i < kanjiPerLevel; i++) {
      const index = (5 - jlptLevel) * 100 + i;
      
      // Lấy kanji từ danh sách mẫu hoặc tạo một chuỗi unique
      const character = index < sampleKanji.length 
        ? sampleKanji[index]
        : `漢${index}`; // Dùng prefix 漢 + số để tạo unique character
      
      const onyomi = onyomiSamples[Math.floor(Math.random() * onyomiSamples.length)];
      const kunyomi = kunyomiSamples[Math.floor(Math.random() * kunyomiSamples.length)];
      const meanings = meaningGroups[Math.floor(Math.random() * meaningGroups.length)].join(', ');
      const strokeCount = Math.floor(Math.random() * 20) + 3; // 3-22 strokes
      const grade = jlptLevel >= 4 ? Math.floor(Math.random() * 6) + 1 : null; // Grade 1-6 for N5/N4
      const frequency = index + 1;
      const radicals = radicalSamples[Math.floor(Math.random() * radicalSamples.length)];

      await prisma.kanji.upsert({
        where: { character },
        update: {},
        create: {
          character,
          onyomi,
          kunyomi,
          meanings,
          stroke_count: strokeCount,
          jlpt: jlptLevel,
          grade,
          frequency,
          radicals,
        },
      });

      inserted++;
      if (inserted % 100 === 0) {
        console.log(`✓ Đã seed ${inserted}/500 kanji (JLPT N${jlptLevel})...`);
      }
    }
  }

  console.log(`✅ Seed Kanji hoàn tất! Tổng: ${inserted} chữ kanji (100 chữ/cấp độ cho N5, N4, N3, N2, N1)`);
}

async function main() {
  // Seed admin user
  await adminCreate();
  await kanjiSeed();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
