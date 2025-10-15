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
  // eslint-disable-next-line prettier/prettier
  const candidates = [
    path.resolve(__dirname, 'data/kanji_hanviet.json'),
    path.resolve(process.cwd(), 'prisma/data/kanji_hanviet.json'),
  ];

  const file = candidates.find((p) => fs.existsSync(p));
  if (!file) {
    console.warn(
      '⚠️  Không tìm thấy file kanji-merged.json hoặc kanji-merged-fixed.json — bỏ qua seed Kanji.',
    );
    return;
  }

  const raw = fs.readFileSync(file, 'utf-8');
  const data = JSON.parse(raw) as Record<string, any>;

  let inserted = 0;
  for (const [char, info] of Object.entries(data)) {
    await prisma.kanji.upsert({
      where: { character: char },
      update: {},
      create: {
        character: char,
        onyomi: Array.isArray(info.readings_on)
          ? info.readings_on.join(', ')
          : info.readings_on ?? null,
        kunyomi: Array.isArray(info.readings_kun)
          ? info.readings_kun.join(', ')
          : info.readings_kun ?? null,
        meanings: Array.isArray(info.meanings)
          ? info.meanings.join(', ')
          : info.meanings ?? '',
        meaning_explanations: info.meanings_explained
          ? (Array.isArray(info.meanings_explained)
              ? info.meanings_explained.join(', ')
              : String(info.meanings_explained))
          : null,
        stroke_count: typeof info.strokes === 'number' ? info.strokes : null,
        jlpt: info.jlpt_new ?? info.jlpt_old ?? null,
        grade: typeof info.grade === 'number' ? info.grade : null,
        frequency: typeof info.freq === 'number' ? info.freq : null,
        radicals: Array.isArray(info.wk_radicals)
          ? info.wk_radicals.join(', ')
          : info.wk_radicals ?? null,
      },
    });

    inserted++;
    if (inserted % 500 === 0) console.log(`Inserted ${inserted} kanji...`);
  }

  console.log(`✅ Import Kanji hoàn tất! tổng: ${inserted}`);
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
