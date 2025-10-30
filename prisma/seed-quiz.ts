import { PrismaClient, QuizQuestionType } from '../generated/prisma';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding quiz data...');

  // Get admin user
  const admin = await prisma.user.findUnique({
    where: { email: 'admin@kanji.app' },
  });

  if (!admin) {
    console.error('Admin user not found. Please run main seed first.');
    return;
  }

  // Get some kanji from the database
  const kanji = await prisma.kanji.findMany({
    take: 20,
    orderBy: { character: 'asc' },
  });

  if (kanji.length === 0) {
    console.error('No kanji found. Please run main seed first.');
    return;
  }

  console.log(`Found ${kanji.length} kanji for quiz questions`);

  // Helper function to parse meanings
  const getMeaning = (meaningString: string, index: number = 0): string => {
    try {
      const meanings = JSON.parse(meaningString);
      return meanings[index] || 'unknown';
    } catch {
      return meaningString || 'unknown';
    }
  };

  // Quiz 1: Basic Kanji Readings
  const quiz1 = await prisma.quiz.create({
    data: {
      title: 'Basic Kanji Readings (JLPT N5)',
      description: 'Test your knowledge of basic kanji readings used in everyday Japanese.',
      isPublic: true,
      userId: admin.id,
      questions: {
        create: [
          {
            questionText: `What is the kun reading of ${kanji[0].character}?`,
            type: QuizQuestionType.MULTIPLE_CHOICE,
            points: 10,
            order: 1,
            correctAnswer: kanji[0].kunyomi?.split(',')[0]?.trim() || 'ひ',
            options: {
              choices: [
                kanji[0].kunyomi?.split(',')[0]?.trim() || 'ひ',
                'つき',
                'みず',
                'き',
              ],
            },
          },
          {
            questionText: `What is the on reading of ${kanji[1].character}?`,
            type: QuizQuestionType.MULTIPLE_CHOICE,
            points: 10,
            order: 2,
            correctAnswer: kanji[1].onyomi?.split(',')[0]?.trim() || 'ゲツ',
            options: {
              choices: [
                'ニチ',
                kanji[1].onyomi?.split(',')[0]?.trim() || 'ゲツ',
                'スイ',
                'カ',
              ],
            },
          },
          {
            questionText: `The kanji ${kanji[2].character} means:`,
            type: QuizQuestionType.MULTIPLE_CHOICE,
            points: 10,
            order: 3,
            correctAnswer: getMeaning(kanji[2].meanings, 0),
            options: {
              choices: [
                'sun',
                'moon',
                getMeaning(kanji[2].meanings, 0),
                'fire',
              ],
            },
          },
          {
            questionText: `${kanji[3].character} is pronounced as _____ in 火曜日 (Tuesday).`,
            type: QuizQuestionType.FILL_IN_BLANK,
            points: 15,
            order: 4,
            correctAnswer: 'か',
          },
          {
            questionText: `The stroke count of ${kanji[4].character} is 4.`,
            type: QuizQuestionType.TRUE_FALSE,
            points: 5,
            order: 5,
            correctAnswer: (kanji[4].strokeCount || 0) === 4 ? 'true' : 'false',
          },
        ],
      },
    },
    include: {
      questions: true,
    },
  });

  console.log(`Created quiz: ${quiz1.title} with ${quiz1.questions.length} questions`);

  // Quiz 2: Kanji Meanings
  const quiz2 = await prisma.quiz.create({
    data: {
      title: 'Kanji Meanings and Usage',
      description: 'Learn the meanings and common usage of essential kanji characters.',
      isPublic: true,
      userId: admin.id,
      questions: {
        create: [
          {
            questionText: `What is the primary meaning of ${kanji[5].character}?`,
            type: QuizQuestionType.MULTIPLE_CHOICE,
            points: 10,
            order: 1,
            correctAnswer: getMeaning(kanji[5].meanings, 0),
            options: {
              choices: [
                getMeaning(kanji[5].meanings, 0),
                'two',
                'three',
                'four',
              ],
            },
          },
          {
            questionText: `Fill in the blank: ${kanji[6].character} means _____.`,
            type: QuizQuestionType.FILL_IN_BLANK,
            points: 15,
            order: 2,
            correctAnswer: getMeaning(kanji[6].meanings, 0),
          },
          {
            questionText: `${kanji[7].character} is commonly used to represent the number three.`,
            type: QuizQuestionType.TRUE_FALSE,
            points: 5,
            order: 3,
            correctAnswer: 'true',
          },
          {
            questionText: `Which reading is correct for ${kanji[8].character} in 四月 (April)?`,
            type: QuizQuestionType.MULTIPLE_CHOICE,
            points: 10,
            order: 4,
            correctAnswer: 'し',
            options: {
              choices: ['し', 'よん', 'ご', 'ろく'],
            },
          },
        ],
      },
    },
    include: {
      questions: true,
    },
  });

  console.log(`Created quiz: ${quiz2.title} with ${quiz2.questions.length} questions`);

  // Quiz 3: JLPT N5 Kanji Challenge
  const quiz3 = await prisma.quiz.create({
    data: {
      title: 'JLPT N5 Kanji Challenge',
      description: 'A comprehensive quiz covering all essential N5 level kanji. Are you ready?',
      isPublic: true,
      userId: admin.id,
      questions: {
        create: [
          {
            questionText: `Match the kanji ${kanji[9].character} with its meaning:`,
            type: QuizQuestionType.MULTIPLE_CHOICE,
            points: 10,
            order: 1,
            correctAnswer: getMeaning(kanji[9].meanings, 0),
            options: {
              choices: [
                'four',
                getMeaning(kanji[9].meanings, 0),
                'six',
                'seven',
              ],
            },
          },
          {
            questionText: `The on reading of ${kanji[10].character} is _____.`,
            type: QuizQuestionType.FILL_IN_BLANK,
            points: 15,
            order: 2,
            correctAnswer: kanji[10].onyomi?.split(',')[0]?.trim() || 'ロク',
          },
          {
            questionText: `${kanji[11].character} has more than 5 strokes.`,
            type: QuizQuestionType.TRUE_FALSE,
            points: 5,
            order: 3,
            correctAnswer: (kanji[11].strokeCount || 0) > 5 ? 'true' : 'false',
          },
          {
            questionText: `What is ${kanji[12].character} in hiragana (kun reading)?`,
            type: QuizQuestionType.MULTIPLE_CHOICE,
            points: 10,
            order: 4,
            correctAnswer: kanji[12].kunyomi?.split(',')[0]?.trim() || 'やっつ',
            options: {
              choices: [
                'なな',
                kanji[12].kunyomi?.split(',')[0]?.trim() || 'やっつ',
                'ここの',
                'とお',
              ],
            },
          },
          {
            questionText: `Fill in: ${kanji[13].character} is the kanji for the number _____.`,
            type: QuizQuestionType.FILL_IN_BLANK,
            points: 15,
            order: 5,
            correctAnswer: getMeaning(kanji[13].meanings, 0),
          },
        ],
      },
    },
    include: {
      questions: true,
    },
  });

  console.log(`Created quiz: ${quiz3.title} with ${quiz3.questions.length} questions`);

  // Quiz 4: Days of the Week Kanji
  const quiz4 = await prisma.quiz.create({
    data: {
      title: 'Days of the Week - Kanji Edition',
      description: 'Master the kanji used in Japanese days of the week.',
      isPublic: true,
      userId: admin.id,
      questions: {
        create: [
          {
            questionText: `${kanji[0].character}曜日 means Sunday (day of the sun).`,
            type: QuizQuestionType.TRUE_FALSE,
            points: 5,
            order: 1,
            correctAnswer: 'true',
          },
          {
            questionText: `What day of the week uses the kanji ${kanji[1].character}?`,
            type: QuizQuestionType.MULTIPLE_CHOICE,
            points: 10,
            order: 2,
            correctAnswer: 'Monday',
            options: {
              choices: ['Sunday', 'Monday', 'Tuesday', 'Wednesday'],
            },
          },
          {
            questionText: `${kanji[2].character}曜日 is _____.`,
            type: QuizQuestionType.FILL_IN_BLANK,
            points: 15,
            order: 3,
            correctAnswer: 'Wednesday',
          },
          {
            questionText: `${kanji[3].character} represents which element in the days of the week?`,
            type: QuizQuestionType.MULTIPLE_CHOICE,
            points: 10,
            order: 4,
            correctAnswer: 'fire',
            options: {
              choices: ['water', 'fire', 'wood', 'metal'],
            },
          },
        ],
      },
    },
    include: {
      questions: true,
    },
  });

  console.log(`Created quiz: ${quiz4.title} with ${quiz4.questions.length} questions`);

  // Quiz 5: Kanji Stroke Order Basics (Private quiz for practice)
  const quiz5 = await prisma.quiz.create({
    data: {
      title: 'Kanji Stroke Order Practice',
      description: 'Practice quiz for learning proper kanji stroke order.',
      isPublic: false,
      userId: admin.id,
      questions: {
        create: [
          {
            questionText: `How many strokes does ${kanji[14].character} have?`,
            type: QuizQuestionType.MULTIPLE_CHOICE,
            points: 10,
            order: 1,
            correctAnswer: String(kanji[14].strokeCount || 1),
            options: {
              choices: ['1', '2', '3', '4'],
            },
          },
          {
            questionText: `${kanji[15].character} is written with _____ strokes.`,
            type: QuizQuestionType.FILL_IN_BLANK,
            points: 15,
            order: 2,
            correctAnswer: String(kanji[15].strokeCount || 2),
          },
          {
            questionText: `The kanji ${kanji[16].character} has less than 5 strokes.`,
            type: QuizQuestionType.TRUE_FALSE,
            points: 5,
            order: 3,
            correctAnswer: (kanji[16].strokeCount || 0) < 5 ? 'true' : 'false',
          },
        ],
      },
    },
    include: {
      questions: true,
    },
  });

  console.log(`Created quiz: ${quiz5.title} with ${quiz5.questions.length} questions`);

  console.log('\n✅ Successfully seeded quiz data!');
  console.log(`Total quizzes created: 5`);
  console.log(`- 4 public quizzes`);
  console.log(`- 1 private quiz`);
}

main()
  .catch((e) => {
    console.error('Error seeding quiz data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
