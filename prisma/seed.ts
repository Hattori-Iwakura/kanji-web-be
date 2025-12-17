/* eslint-disable @typescript-eslint/no-unused-vars */
import { PrismaClient, QuizType, DifficultyLevel, QuestionType, PostCategory, ActivityType, VoteType } from '../generated/prisma';
import { Hasher } from '../src/shared/utils';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// Test users (không phải admin)
const TEST_USERS = [
  { account: 'user1', email: 'user1@gmail.com', password: '123456' },
  { account: 'user2', email: 'user2@gmail.com', password: '123456' },
  { account: 'user3', email: 'user3@gmail.com', password: '123456' },
];

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
      role: 'ADMIN',
    },
  });
  return admin;
}

async function createTestUsers() {
  console.log('👥 Tạo test users...');
  const users: any[] = [];
  
  for (const userData of TEST_USERS) {
    const user = await prisma.users.upsert({
      where: { account: userData.account },
      update: {},
      create: {
        account: userData.account,
        email: userData.email,
        hash_password: await Hasher.hash(userData.password),
        is_first_login: false,
        is_active: true,
        role: 'USER',
      },
    });
    users.push(user);
  }
  
  console.log(`✅ Đã tạo ${users.length} test users`);
  return users;
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
  const insertedKanjis: any[] = [];
  
  for (let i = 0; i < Math.min(LIMIT, kanjiEntries.length); i++) {
    const [character, data] = kanjiEntries[i] as [string, any];
    
    try {
      // Chuyển đổi readings từ array sang string
      const onyomi = data.readings_on?.join(', ') || null;
      const kunyomi = data.readings_kun?.join(', ') || null;
      const meanings = data.meanings?.join(', ') || 'No meaning';
      const radicals = data.wk_radicals?.join(', ') || null;

      const kanji = await prisma.kanji.upsert({
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

      insertedKanjis.push(kanji);
      inserted++;
      if (inserted % 50 === 0) {
        console.log(`✓ Đã seed ${inserted}/${LIMIT} kanji...`);
      }
    } catch (error: any) {
      console.error(`❌ Lỗi khi seed kanji "${character}":`, error.message);
    }
  }

  console.log(`✅ Seed Kanji hoàn tất! Tổng: ${inserted} chữ kanji`);
  return insertedKanjis;
}

async function seedUserProfiles(users: any[]) {
  console.log('📝 Tạo user profiles...');
  
  for (const user of users) {
    await prisma.userProfile.upsert({
      where: { user_id: user.id },
      update: {},
      create: {
        user_id: user.id,
        display_name: `${user.account.charAt(0).toUpperCase()}${user.account.slice(1)} Learner`,
        bio: `Tôi là ${user.account}, đang học tiếng Nhật!`,
        total_kanji: Math.floor(Math.random() * 100),
        total_quiz: Math.floor(Math.random() * 20),
        total_flashcard: Math.floor(Math.random() * 50),
        total_points: Math.floor(Math.random() * 1000),
        current_streak: Math.floor(Math.random() * 10),
        longest_streak: Math.floor(Math.random() * 20),
      },
    });
  }
  
  console.log('✅ User profiles đã tạo');
}

async function seedKanjiCollections(users: any[], kanjis: any[]) {
  console.log('📚 Tạo kanji collections...');
  
  const collections: any[] = [];
  
  // Public collections
  const jlptN5 = await prisma.kanjiCollections.upsert({
    where: { name: 'JLPT N5 Kanji' },
    update: {},
    create: {
      name: 'JLPT N5 Kanji',
      description: 'Tất cả kanji cho kỳ thi JLPT N5',
      is_public: true,
      collection_type: 'jlpt',
      metadata: { jlpt_level: 5 },
    },
  });
  collections.push(jlptN5);
  
  const jlptN4 = await prisma.kanjiCollections.upsert({
    where: { name: 'JLPT N4 Kanji' },
    update: {},
    create: {
      name: 'JLPT N4 Kanji',
      description: 'Tất cả kanji cho kỳ thi JLPT N4',
      is_public: true,
      collection_type: 'jlpt',
      metadata: { jlpt_level: 4 },
    },
  });
  collections.push(jlptN4);
  
  // User collections
  for (const user of users.slice(0, 2)) {
    const collection = await prisma.kanjiCollections.create({
      data: {
        name: `${user.account}'s Favorite Kanji`,
        description: `Danh sách kanji yêu thích của ${user.account}`,
        user_id: user.id,
        is_public: false,
        collection_type: 'custom',
      },
    });
    collections.push(collection);
  }
  
  // Add kanji to collections
  for (const collection of collections) {
    const kanjiToAdd = kanjis
      .filter(k => {
        if (collection.name.includes('N5')) return k.jlpt === 5;
        if (collection.name.includes('N4')) return k.jlpt === 4;
        return true;
      })
      .slice(0, 20);
    
    for (let i = 0; i < kanjiToAdd.length; i++) {
      await prisma.kanjiCollectionItems.create({
        data: {
          collection_id: collection.id,
          kanji_id: kanjiToAdd[i].id,
          order_index: i,
        },
      });
    }
  }
  
  console.log(`✅ Đã tạo ${collections.length} kanji collections`);
  return collections;
}

async function seedQuizzes(users: any[], kanjis: any[]) {
  console.log('📝 Tạo quizzes...');
  
  const quizzes: any[] = [];
  
  // Public quizzes
  const publicQuiz = await prisma.quiz.create({
    data: {
      title: 'JLPT N5 Quiz - Kanji Basics',
      description: 'Test your knowledge of basic JLPT N5 kanji',
      is_public: true,
      quiz_type: QuizType.MULTIPLE_CHOICE,
      difficulty: DifficultyLevel.EASY,
      time_limit: 600, // 10 minutes
      passing_score: 70,
    },
  });
  quizzes.push(publicQuiz);
  
  // User quizzes
  for (const user of users.slice(0, 2)) {
    const quiz = await prisma.quiz.create({
      data: {
        title: `${user.account}'s Custom Quiz`,
        description: `Quiz tự tạo bởi ${user.account}`,
        user_id: user.id,
        is_public: false,
        quiz_type: QuizType.MULTIPLE_CHOICE,
        difficulty: DifficultyLevel.MEDIUM,
        time_limit: 900,
        passing_score: 60,
      },
    });
    quizzes.push(quiz);
  }
  
  // Add questions to quizzes
  for (const quiz of quizzes) {
    const quizKanjis = kanjis.slice(0, 10);
    
    for (let i = 0; i < quizKanjis.length; i++) {
      const kanji = quizKanjis[i];
      const wrongAnswers = kanjis
        .filter(k => k.id !== kanji.id)
        .slice(0, 3)
        .map(k => k.meanings);
      
      await prisma.quizQuestion.create({
        data: {
          quiz_id: quiz.id,
          kanji_id: kanji.id,
          question_type: QuestionType.KANJI_TO_MEANING,
          question_text: `Nghĩa của kanji "${kanji.character}" là gì?`,
          correct_answer: kanji.meanings,
          options: [kanji.meanings, ...wrongAnswers],
          explanation: `Kanji "${kanji.character}" có nghĩa là: ${kanji.meanings}`,
          points: 1,
          order_index: i,
        },
      });
    }
  }
  
  console.log(`✅ Đã tạo ${quizzes.length} quizzes với câu hỏi`);
  return quizzes;
}

async function seedQuizResults(users: any[], quizzes: any[]) {
  console.log('📊 Tạo quiz results...');
  
  let count = 0;
  for (const user of users) {
    for (const quiz of quizzes.slice(0, 2)) {
      const totalQuestions = 10;
      const correctAnswers = Math.floor(Math.random() * totalQuestions) + 1;
      const score = Math.floor((correctAnswers / totalQuestions) * 100);
      
      await prisma.quizResult.create({
        data: {
          quiz_id: quiz.id,
          user_id: user.id,
          score,
          total_questions: totalQuestions,
          correct_answers: correctAnswers,
          time_taken: Math.floor(Math.random() * 600) + 120,
          answers: [
            { question_id: 1, user_answer: 'answer1', is_correct: true },
            { question_id: 2, user_answer: 'answer2', is_correct: false },
          ],
        },
      });
      count++;
    }
  }
  
  console.log(`✅ Đã tạo ${count} quiz results`);
}

async function seedFlashcards(users: any[], kanjis: any[]) {
  console.log('🎴 Tạo flashcard decks...');
  
  const decks: any[] = [];
  
  // Public deck
  const publicDeck = await prisma.flashcardDeck.create({
    data: {
      name: 'Essential Kanji for Beginners',
      description: 'Top 100 essential kanji for Japanese beginners',
      is_public: true,
    },
  });
  decks.push(publicDeck);
  
  // User decks
  for (const user of users.slice(0, 2)) {
    const deck = await prisma.flashcardDeck.create({
      data: {
        name: `${user.account}'s Study Deck`,
        description: `Flashcard deck của ${user.account}`,
        user_id: user.id,
        is_public: false,
      },
    });
    decks.push(deck);
  }
  
  // Add cards to decks
  for (const deck of decks) {
    const deckKanjis = kanjis.slice(0, 15);
    
    for (let i = 0; i < deckKanjis.length; i++) {
      const kanji = deckKanjis[i];
      await prisma.flashcardCard.create({
        data: {
          deck_id: deck.id,
          kanji_id: kanji.id,
          front_text: kanji.character,
          back_text: `Nghĩa: ${kanji.meanings}\nÂm Hán: ${kanji.onyomi || 'N/A'}\nÂm Kun: ${kanji.kunyomi || 'N/A'}`,
          hint: `Nét: ${kanji.stroke_count || 'N/A'}`,
          order_index: i,
        },
      });
    }
  }
  
  console.log(`✅ Đã tạo ${decks.length} flashcard decks với cards`);
  return decks;
}

async function seedCommunityPosts(users: any[]) {
  console.log('💬 Tạo community posts...');
  
  const posts: any[] = [];
  const postData = [
    {
      title: 'Tips học Kanji hiệu quả cho người mới bắt đầu',
      content: 'Mình muốn chia sẻ một số tips học Kanji hiệu quả mà mình đã áp dụng...',
      category: PostCategory.TIPS,
      tags: ['kanji', 'tips', 'beginner'],
    },
    {
      title: 'Làm thế nào để nhớ được âm đọc của Kanji?',
      content: 'Mình đang gặp khó khăn trong việc nhớ âm Hán và âm Kun. Các bạn có tips nào không?',
      category: PostCategory.QUESTION,
      tags: ['question', 'reading', 'onyomi', 'kunyomi'],
    },
    {
      title: 'Nhật ký học tập ngày 1 - JLPT N5',
      content: 'Hôm nay mình bắt đầu học JLPT N5. Mình đã học được 20 kanji đầu tiên!',
      category: PostCategory.STUDY_LOG,
      tags: ['study-log', 'jlpt-n5', 'progress'],
    },
    {
      title: 'Tài liệu học Kanji miễn phí hay',
      content: 'Mình tổng hợp một số tài liệu học Kanji miễn phí chất lượng...',
      category: PostCategory.RESOURCES,
      tags: ['resources', 'free', 'kanji'],
    },
  ];
  
  for (let i = 0; i < postData.length; i++) {
    const user = users[i % users.length];
    const post = await prisma.communityPost.create({
      data: {
        user_id: user.id,
        title: postData[i].title,
        content: postData[i].content,
        category: postData[i].category,
        tags: postData[i].tags,
        view_count: Math.floor(Math.random() * 100),
        is_pinned: i === 0, // Pin first post
      },
    });
    posts.push(post);
  }
  
  console.log(`✅ Đã tạo ${posts.length} community posts`);
  return posts;
}

async function seedCommunityComments(users: any[], posts: any[]) {
  console.log('💭 Tạo community comments...');
  
  let count = 0;
  for (const post of posts) {
    const numComments = Math.floor(Math.random() * 5) + 1;
    
    for (let i = 0; i < numComments; i++) {
      const user = users[Math.floor(Math.random() * users.length)];
      await prisma.communityComment.create({
        data: {
          post_id: post.id,
          user_id: user.id,
          content: `Cảm ơn bạn đã chia sẻ! Rất hữu ích. (Comment ${i + 1})`,
        },
      });
      count++;
    }
  }
  
  console.log(`✅ Đã tạo ${count} comments`);
}

async function seedLikes(users: any[], posts: any[]) {
  console.log('👍 Tạo post likes...');
  
  let count = 0;
  for (const post of posts) {
    const numLikes = Math.floor(Math.random() * users.length);
    
    for (let i = 0; i < numLikes; i++) {
      const user = users[i];
      try {
        await prisma.postLike.create({
          data: {
            post_id: post.id,
            user_id: user.id,
            vote_type: Math.random() > 0.2 ? VoteType.UPVOTE : VoteType.DOWNVOTE,
          },
        });
        count++;
      } catch (e) {
        // Skip duplicate likes
      }
    }
  }
  
  console.log(`✅ Đã tạo ${count} post likes`);
}

async function seedLearningHistory(users: any[]) {
  console.log('📈 Tạo learning history...');
  
  let count = 0;
  for (const user of users) {
    // Quiz completed
    for (let i = 0; i < 5; i++) {
      await prisma.learningHistory.create({
        data: {
          user_id: user.id,
          activity_type: ActivityType.QUIZ_COMPLETED,
          activity_data: {
            quiz_id: 1,
            score: Math.floor(Math.random() * 100),
            correct_answers: Math.floor(Math.random() * 10),
          },
          points_earned: Math.floor(Math.random() * 50) + 10,
        },
      });
      count++;
    }
    
    // Flashcard studied
    for (let i = 0; i < 3; i++) {
      await prisma.learningHistory.create({
        data: {
          user_id: user.id,
          activity_type: ActivityType.FLASHCARD_STUDIED,
          activity_data: {
            deck_id: 1,
            cards_studied: Math.floor(Math.random() * 20) + 5,
          },
          points_earned: Math.floor(Math.random() * 30) + 5,
        },
      });
      count++;
    }
  }
  
  console.log(`✅ Đã tạo ${count} learning history records`);
}

async function seedPublicRequests(users: any[], quizzes: any[], decks: any[]) {
  console.log('📮 Tạo public requests...');
  
  // Quiz public requests
  for (let i = 0; i < 2; i++) {
    const quiz = quizzes[i + 1]; // Skip first public quiz
    if (quiz && quiz.user_id) {
      await prisma.publicQuizRequest.create({
        data: {
          quiz_id: quiz.id,
          user_id: quiz.user_id,
          reason: 'Tôi muốn chia sẻ quiz này với cộng đồng vì nó rất hữu ích cho người học JLPT.',
          status: 'PENDING',
        },
      });
    }
  }
  
  // Deck public requests
  for (let i = 0; i < 2; i++) {
    const deck = decks[i + 1]; // Skip first public deck
    if (deck && deck.user_id) {
      await prisma.publicDeckRequest.create({
        data: {
          deck_id: deck.id,
          user_id: deck.user_id,
          reason: 'Deck này chứa các flashcard chất lượng cao, tôi muốn chia sẻ với mọi người.',
          status: 'PENDING',
        },
      });
    }
  }
  
  console.log('✅ Đã tạo public requests');
}

async function main() {
  console.log('🚀 Bắt đầu seed database...\n');
  
  // Seed admin user
  console.log('👤 Tạo admin user...');
  const admin = await adminCreate();
  console.log('✅ Admin user đã tạo\n');
  
  // Seed test users
  const users = await createTestUsers();
  console.log('');
  
  // Seed kanji
  const kanjis = await kanjiSeed();
  console.log('');
  
  // Seed user profiles
  await seedUserProfiles(users);
  console.log('');
  
  // Seed kanji collections
  const collections = await seedKanjiCollections(users, kanjis);
  console.log('');
  
  // Seed quizzes
  const quizzes = await seedQuizzes(users, kanjis);
  console.log('');
  
  // Seed quiz results
  await seedQuizResults(users, quizzes);
  console.log('');
  
  // Seed flashcards
  const decks = await seedFlashcards(users, kanjis);
  console.log('');
  
  // Seed community posts
  const posts = await seedCommunityPosts(users);
  console.log('');
  
  // Seed comments
  await seedCommunityComments(users, posts);
  console.log('');
  
  // Seed likes
  await seedLikes(users, posts);
  console.log('');
  
  // Seed learning history
  await seedLearningHistory(users);
  console.log('');
  
  // Seed public requests
  await seedPublicRequests(users, quizzes, decks);
  console.log('');
  
  console.log('\n🎉 Seed hoàn tất!');
  console.log('\n📋 Tóm tắt:');
  console.log(`   - Admin: 1 user (admin/123456)`);
  console.log(`   - Test Users: ${users.length} users (user1/123456, user2/123456, user3/123456)`);
  console.log(`   - Kanji: ${kanjis.length} characters`);
  console.log(`   - Kanji Collections: ${collections.length} collections`);
  console.log(`   - Quizzes: ${quizzes.length} quizzes`);
  console.log(`   - Flashcard Decks: ${decks.length} decks`);
  console.log(`   - Community Posts: ${posts.length} posts`);
  console.log(`   - Public Requests: Pending requests for review`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
