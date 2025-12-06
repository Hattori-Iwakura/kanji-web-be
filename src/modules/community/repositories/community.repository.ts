import { Injectable } from '@nestjs/common';
import { DbClient } from 'src/modules/db_client/db_client.service';
import { PostCategory } from 'generated/prisma';
import { CreatePostDto } from '../dtos/create-post.dto';
import { UpdatePostDto } from '../dtos/update-post.dto';

@Injectable()
export class CommunityRepository {
  constructor(private prisma: DbClient) {}

  // ==================== POST METHODS ====================

  async createPost(userId: number, data: CreatePostDto) {
    return this.prisma.communityPost.create({
      data: {
        user_id: userId,
        ...data,
      },
      include: {
        User: {
          select: {
            id: true,
            account: true,
            profile_image: true,
            role: true,
            UserProfile: {
              select: {
                display_name: true,
              },
            },
          },
        },
        _count: {
          select: {
            Comments: true,
            Likes: true,
          },
        },
      },
    });
  }

  async findPostById(postId: number) {
    return this.prisma.communityPost.findUnique({
      where: { id: postId },
      include: {
        User: {
          select: {
            id: true,
            account: true,
            profile_image: true,
            role: true,
            UserProfile: {
              select: {
                display_name: true,
              },
            },
          },
        },
        _count: {
          select: {
            Comments: true,
            Likes: true,
          },
        },
      },
    });
  }

  async findPosts(options: {
    category?: PostCategory;
    limit?: number;
    offset?: number;
    userId?: number;
    search?: string;
  }) {
    const { category, limit = 20, offset = 0, userId, search } = options;

    const where: any = {};
    if (category) where.category = category;
    if (userId) where.user_id = userId;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.communityPost.findMany({
      where,
      include: {
        User: {
          select: {
            id: true,
            account: true,
            profile_image: true,
            role: true,
            UserProfile: {
              select: {
                display_name: true,
              },
            },
          },
        },
        _count: {
          select: {
            Comments: true,
            Likes: true,
          },
        },
      },
      orderBy: [{ is_pinned: 'desc' }, { create_at: 'desc' }],
      take: limit,
      skip: offset,
    });
  }

  async updatePost(postId: number, data: UpdatePostDto) {
    return this.prisma.communityPost.update({
      where: { id: postId },
      data: {
        ...data,
        update_at: new Date(),
      },
      include: {
        User: {
          select: {
            id: true,
            account: true,
            profile_image: true,
          },
        },
        _count: {
          select: {
            Comments: true,
            Likes: true,
          },
        },
      },
    });
  }

  async deletePost(postId: number) {
    return this.prisma.communityPost.delete({
      where: { id: postId },
    });
  }

  async incrementViewCount(postId: number) {
    return this.prisma.communityPost.update({
      where: { id: postId },
      data: {
        view_count: { increment: 1 },
      },
    });
  }

  // ==================== COMMENT METHODS ====================

  async createComment(postId: number, userId: number, content: string, parentId?: number) {
    return this.prisma.communityComment.create({
      data: {
        post_id: postId,
        user_id: userId,
        content,
        parent_id: parentId,
      },
      include: {
        User: {
          select: {
            id: true,
            account: true,
            profile_image: true,
          },
        },
        _count: {
          select: {
            Likes: true,
            Replies: true,
          },
        },
      },
    });
  }

  async findCommentById(commentId: number) {
    return this.prisma.communityComment.findUnique({
      where: { id: commentId },
      include: {
        User: {
          select: {
            id: true,
            account: true,
            profile_image: true,
          },
        },
        _count: {
          select: {
            Likes: true,
            Replies: true,
          },
        },
      },
    });
  }

  async findCommentsByPost(postId: number) {
    return this.prisma.communityComment.findMany({
      where: {
        post_id: postId,
        parent_id: null, // Only get top-level comments
      },
      include: {
        User: {
          select: {
            id: true,
            account: true,
            profile_image: true,
            role: true,
            UserProfile: {
              select: {
                display_name: true,
              },
            },
          },
        },
        Replies: {
          include: {
            User: {
              select: {
                id: true,
                account: true,
                profile_image: true,
                role: true,
                UserProfile: {
                  select: {
                    display_name: true,
                  },
                },
              },
            },
            _count: {
              select: {
                Likes: true,
              },
            },
          },
          orderBy: { create_at: 'asc' },
        },
        _count: {
          select: {
            Likes: true,
          },
        },
      },
      orderBy: { create_at: 'desc' },
    });
  }

  async updateComment(commentId: number, content: string) {
    return this.prisma.communityComment.update({
      where: { id: commentId },
      data: {
        content,
        update_at: new Date(),
      },
      include: {
        User: {
          select: {
            id: true,
            account: true,
            profile_image: true,
          },
        },
        _count: {
          select: {
            Likes: true,
            Replies: true,
          },
        },
      },
    });
  }

  async deleteComment(commentId: number) {
    return this.prisma.communityComment.delete({
      where: { id: commentId },
    });
  }

  // ==================== VOTE METHODS ====================

  async votePost(postId: number, userId: number, voteType: 'UPVOTE' | 'DOWNVOTE') {
    console.log('=== REPOSITORY VOTE POST ===');
    console.log('postId:', postId, 'userId:', userId, 'voteType:', voteType);
    
    const existing = await this.prisma.postLike.findUnique({
      where: {
        post_id_user_id: {
          post_id: postId,
          user_id: userId,
        },
      },
    });

    console.log('Existing vote:', existing);

    if (existing) {
      if (existing.vote_type === voteType) {
        // Remove vote if clicking same type
        console.log('Removing vote (same type clicked)');
        await this.prisma.postLike.delete({
          where: {
            post_id_user_id: {
              post_id: postId,
              user_id: userId,
            },
          },
        });
        console.log('Vote removed, returning null');
        return { voteType: null };
      } else {
        // Change vote type
        console.log('Changing vote type from', existing.vote_type, 'to', voteType);
        await this.prisma.postLike.update({
          where: {
            post_id_user_id: {
              post_id: postId,
              user_id: userId,
            },
          },
          data: { vote_type: voteType },
        });
        console.log('Vote type changed, returning', voteType);
        return { voteType };
      }
    } else {
      // Create new vote
      console.log('Creating new vote');
      await this.prisma.postLike.create({
        data: {
          post_id: postId,
          user_id: userId,
          vote_type: voteType,
        },
      });
      console.log('New vote created, returning', voteType);
      return { voteType };
    }
  }

  async voteComment(commentId: number, userId: number, voteType: 'UPVOTE' | 'DOWNVOTE') {
    const existing = await this.prisma.commentLike.findUnique({
      where: {
        comment_id_user_id: {
          comment_id: commentId,
          user_id: userId,
        },
      },
    });

    if (existing) {
      if (existing.vote_type === voteType) {
        // Remove vote if clicking same type
        await this.prisma.commentLike.delete({
          where: {
            comment_id_user_id: {
              comment_id: commentId,
              user_id: userId,
            },
          },
        });
        return { voteType: null };
      } else {
        // Change vote type
        await this.prisma.commentLike.update({
          where: {
            comment_id_user_id: {
              comment_id: commentId,
              user_id: userId,
            },
          },
          data: { vote_type: voteType },
        });
        return { voteType };
      }
    } else {
      // Create new vote
      await this.prisma.commentLike.create({
        data: {
          comment_id: commentId,
          user_id: userId,
          vote_type: voteType,
        },
      });
      return { voteType };
    }
  }

  async getUserVoteOnPost(postId: number, userId: number) {
    const vote = await this.prisma.postLike.findUnique({
      where: {
        post_id_user_id: {
          post_id: postId,
          user_id: userId,
        },
      },
    });
    return vote?.vote_type || null;
  }

  async getPostVoteCounts(postId: number) {
    const upvotes = await this.prisma.postLike.count({
      where: { post_id: postId, vote_type: 'UPVOTE' },
    });
    const downvotes = await this.prisma.postLike.count({
      where: { post_id: postId, vote_type: 'DOWNVOTE' },
    });
    const result = { upvotes, downvotes, total: upvotes - downvotes };
    console.log(`Post ${postId} vote counts:`, result);
    return result;
  }

  async getUserVoteOnComment(commentId: number, userId: number) {
    const vote = await this.prisma.commentLike.findUnique({
      where: {
        comment_id_user_id: {
          comment_id: commentId,
          user_id: userId,
        },
      },
    });
    return vote?.vote_type || null;
  }

  async getCommentVoteCounts(commentId: number) {
    const upvotes = await this.prisma.commentLike.count({
      where: { comment_id: commentId, vote_type: 'UPVOTE' },
    });
    const downvotes = await this.prisma.commentLike.count({
      where: { comment_id: commentId, vote_type: 'DOWNVOTE' },
    });
    return { upvotes, downvotes, total: upvotes - downvotes };
  }
}
