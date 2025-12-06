import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { DbClient } from '../src/modules/db_client/db_client.service';

describe('Community (e2e)', () => {
  let app: INestApplication;
  let prisma: DbClient;
  let authToken: string;
  let userId: number;
  let testPostId: number;
  let testCommentId: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    prisma = app.get<DbClient>(DbClient);
    await app.init();

    // Create test user and login
    const timestamp = Date.now();
    const testUser = {
      account: `testuser_community_${timestamp}`,
      password: 'Test123!@#',
      email: `testcommunity${timestamp}@test.com`,
    };

    await request(app.getHttpServer())
      .post('/auth/register')
      .send(testUser)
      .expect(201);

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        account: testUser.account,
        password: testUser.password,
      })
      .expect(201);

    authToken = loginResponse.body.data.accessToken;
    userId = loginResponse.body.data.user.id;
  });

  afterAll(async () => {
    // Cleanup: Delete test data
    if (userId) {
      await prisma.postLike.deleteMany({ where: { user_id: userId } });
      await prisma.commentLike.deleteMany({ where: { user_id: userId } });
      await prisma.communityComment.deleteMany({ where: { user_id: userId } });
      await prisma.communityPost.deleteMany({ where: { user_id: userId } });
      await prisma.users.delete({ where: { id: userId } });
    }
    await app.close();
  });

  describe('/community/posts (POST)', () => {
    it('should create a new post', () => {
      const newPost = {
        title: 'Test Post Title',
        content: 'This is a test post content with detailed information about learning Japanese.',
        category: 'DISCUSSION',
        tags: ['test', 'japanese', 'learning'],
      };

      return request(app.getHttpServer())
        .post('/community/posts')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newPost)
        .expect(201)
        .expect((res) => {
          expect(res.body.data).toHaveProperty('id');
          expect(res.body.data).toHaveProperty('title', newPost.title);
          expect(res.body.data).toHaveProperty('content', newPost.content);
          expect(res.body.data).toHaveProperty('category', newPost.category);
          expect(res.body.data).toHaveProperty('tags');
          expect(res.body.data.tags).toEqual(newPost.tags);
          expect(res.body.data).toHaveProperty('user_id', userId);
          expect(res.body.data).toHaveProperty('User');
          testPostId = res.body.data.id;
        });
    });

    it('should validate required fields', () => {
      return request(app.getHttpServer())
        .post('/community/posts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Test',
          // Missing content and category
        })
        .expect(400);
    });

    it('should validate category enum', () => {
      return request(app.getHttpServer())
        .post('/community/posts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Test Post',
          content: 'Test content',
          category: 'INVALID_CATEGORY',
        })
        .expect(400);
    });

    it('should fail without auth token', () => {
      return request(app.getHttpServer())
        .post('/community/posts')
        .send({
          title: 'Test',
          content: 'Test content',
          category: 'DISCUSSION',
        })
        .expect(401);
    });
  });

  describe('/community/posts (GET)', () => {
    it('should get all posts', () => {
      return request(app.getHttpServer())
        .get('/community/posts')
        .expect(200)
        .expect((res) => {
          expect(res.body.data).toBeInstanceOf(Array);
          if (res.body.data.length > 0) {
            expect(res.body.data[0]).toHaveProperty('id');
            expect(res.body.data[0]).toHaveProperty('title');
            expect(res.body.data[0]).toHaveProperty('content');
            expect(res.body.data[0]).toHaveProperty('category');
            expect(res.body.data[0]).toHaveProperty('User');
            expect(res.body.data[0]).toHaveProperty('_count');
          }
        });
    });

    it('should filter posts by category', () => {
      return request(app.getHttpServer())
        .get('/community/posts?category=DISCUSSION')
        .expect(200)
        .expect((res) => {
          expect(res.body.data).toBeInstanceOf(Array);
          res.body.data.forEach((post) => {
            expect(post.category).toBe('DISCUSSION');
          });
        });
    });

    it('should support pagination', () => {
      return request(app.getHttpServer())
        .get('/community/posts?limit=5&offset=0')
        .expect(200)
        .expect((res) => {
          expect(res.body.data).toBeInstanceOf(Array);
          expect(res.body.data.length).toBeLessThanOrEqual(5);
        });
    });

    it('should search posts', () => {
      return request(app.getHttpServer())
        .get('/community/posts?search=Test')
        .expect(200)
        .expect((res) => {
          expect(res.body.data).toBeInstanceOf(Array);
        });
    });
  });

  describe('/community/posts/:id (GET)', () => {
    it('should get post by id', () => {
      return request(app.getHttpServer())
        .get(`/community/posts/${testPostId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.data).toHaveProperty('id', testPostId);
          expect(res.body.data).toHaveProperty('title');
          expect(res.body.data).toHaveProperty('content');
          expect(res.body.data).toHaveProperty('view_count');
          expect(res.body.data).toHaveProperty('isLiked');
        });
    });

    it('should increment view count', async () => {
      const firstView = await request(app.getHttpServer())
        .get(`/community/posts/${testPostId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const secondView = await request(app.getHttpServer())
        .get(`/community/posts/${testPostId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(secondView.body.data.view_count).toBeGreaterThan(
        firstView.body.data.view_count,
      );
    });

    it('should return 404 for non-existent post', () => {
      return request(app.getHttpServer())
        .get('/community/posts/999999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('/community/posts/:id (PUT)', () => {
    it('should update own post', () => {
      const updateData = {
        title: 'Updated Test Post Title',
        content: 'Updated content',
        tags: ['updated', 'test'],
      };

      return request(app.getHttpServer())
        .put(`/community/posts/${testPostId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200)
        .expect((res) => {
          expect(res.body.data).toHaveProperty('title', updateData.title);
          expect(res.body.data).toHaveProperty('content', updateData.content);
          expect(res.body.data.tags).toEqual(updateData.tags);
        });
    });

    it('should fail without auth token', () => {
      return request(app.getHttpServer())
        .put(`/community/posts/${testPostId}`)
        .send({ title: 'Updated' })
        .expect(401);
    });
  });

  describe('/community/posts/:id/like (POST)', () => {
    it('should like a post', () => {
      return request(app.getHttpServer())
        .post(`/community/posts/${testPostId}/like`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(201)
        .expect((res) => {
          expect(res.body.data).toHaveProperty('liked', true);
        });
    });

    it('should unlike a post', () => {
      return request(app.getHttpServer())
        .post(`/community/posts/${testPostId}/like`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(201)
        .expect((res) => {
          expect(res.body.data).toHaveProperty('liked', false);
        });
    });

    it('should fail without auth token', () => {
      return request(app.getHttpServer())
        .post(`/community/posts/${testPostId}/like`)
        .expect(401);
    });
  });

  describe('/community/posts/:postId/comments (POST)', () => {
    it('should create a comment', () => {
      const newComment = {
        content: 'This is a test comment',
      };

      return request(app.getHttpServer())
        .post(`/community/posts/${testPostId}/comments`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(newComment)
        .expect(201)
        .expect((res) => {
          expect(res.body.data).toHaveProperty('id');
          expect(res.body.data).toHaveProperty('content', newComment.content);
          expect(res.body.data).toHaveProperty('post_id', testPostId);
          expect(res.body.data).toHaveProperty('user_id', userId);
          expect(res.body.data).toHaveProperty('User');
          testCommentId = res.body.data.id;
        });
    });

    it('should create a reply to comment', () => {
      const reply = {
        content: 'This is a reply to the comment',
        parent_id: testCommentId,
      };

      return request(app.getHttpServer())
        .post(`/community/posts/${testPostId}/comments`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(reply)
        .expect(201)
        .expect((res) => {
          expect(res.body.data).toHaveProperty('parent_id', testCommentId);
        });
    });

    it('should validate required fields', () => {
      return request(app.getHttpServer())
        .post(`/community/posts/${testPostId}/comments`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400);
    });

    it('should fail without auth token', () => {
      return request(app.getHttpServer())
        .post(`/community/posts/${testPostId}/comments`)
        .send({ content: 'Test' })
        .expect(401);
    });
  });

  describe('/community/posts/:postId/comments (GET)', () => {
    it('should get all comments for a post', () => {
      return request(app.getHttpServer())
        .get(`/community/posts/${testPostId}/comments`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.data).toBeInstanceOf(Array);
          if (res.body.data.length > 0) {
            expect(res.body.data[0]).toHaveProperty('id');
            expect(res.body.data[0]).toHaveProperty('content');
            expect(res.body.data[0]).toHaveProperty('User');
            expect(res.body.data[0]).toHaveProperty('Replies');
          }
        });
    });
  });

  describe('/community/comments/:id (PUT)', () => {
    it('should update own comment', () => {
      const updateData = {
        content: 'Updated comment content',
      };

      return request(app.getHttpServer())
        .put(`/community/comments/${testCommentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200)
        .expect((res) => {
          expect(res.body.data).toHaveProperty('content', updateData.content);
        });
    });

    it('should fail without auth token', () => {
      return request(app.getHttpServer())
        .put(`/community/comments/${testCommentId}`)
        .send({ content: 'Updated' })
        .expect(401);
    });
  });

  describe('/community/comments/:id/like (POST)', () => {
    it('should like a comment', () => {
      return request(app.getHttpServer())
        .post(`/community/comments/${testCommentId}/like`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(201)
        .expect((res) => {
          expect(res.body.data).toHaveProperty('liked');
        });
    });

    it('should fail without auth token', () => {
      return request(app.getHttpServer())
        .post(`/community/comments/${testCommentId}/like`)
        .expect(401);
    });
  });

  describe('/community/comments/:id (DELETE)', () => {
    it('should delete own comment', () => {
      return request(app.getHttpServer())
        .delete(`/community/comments/${testCommentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
    });

    it('should fail without auth token', () => {
      return request(app.getHttpServer())
        .delete(`/community/comments/999`)
        .expect(401);
    });
  });

  describe('/community/posts/:id (DELETE)', () => {
    it('should delete own post', () => {
      return request(app.getHttpServer())
        .delete(`/community/posts/${testPostId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
    });

    it('should fail without auth token', () => {
      return request(app.getHttpServer())
        .delete(`/community/posts/999`)
        .expect(401);
    });
  });
});
