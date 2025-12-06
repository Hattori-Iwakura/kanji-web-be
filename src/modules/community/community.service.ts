import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { CommunityRepository } from './repositories/community.repository';
import { CreatePostDto } from './dtos/create-post.dto';
import { UpdatePostDto } from './dtos/update-post.dto';
import { CreateCommentDto } from './dtos/create-comment.dto';
import { UpdateCommentDto } from './dtos/update-comment.dto';
import { PostCategory } from 'generated/prisma';

@Injectable()
export class CommunityService {
  constructor(private communityRepo: CommunityRepository) {}

  // ==================== POST METHODS ====================

  async createPost(userId: number, createPostDto: CreatePostDto) {
    return this.communityRepo.createPost(userId, createPostDto);
  }

  async getPosts(options: {
    category?: PostCategory;
    limit?: number;
    offset?: number;
    userId?: number;
    search?: string;
    viewerId?: number;
  }) {
    console.log('CommunityService.getPosts - options:', options);
    
    const posts = await this.communityRepo.findPosts(options);
    console.log(`Found ${posts.length} posts`);
    
    // Calculate vote score for each post
    const postsWithVoteScore = await Promise.all(
      posts.map(async (post) => {
        const voteCounts = await this.communityRepo.getPostVoteCounts(post.id);
        let userVote: 'UPVOTE' | 'DOWNVOTE' | null = null;
        
        // Use viewerId to get user's vote
        if (options.viewerId) {
          userVote = await this.communityRepo.getUserVoteOnPost(post.id, options.viewerId);
        }
        
        console.log(`Post ${post.id}: voteScore=${voteCounts.total}, userVote=${userVote}`);
        
        return {
          ...post,
          voteScore: voteCounts.total,
          userVote,
        };
      })
    );
    
    console.log('Returning posts with vote info');
    return postsWithVoteScore;
  }

  async getPostById(postId: number, viewerId?: number) {
    const post = await this.communityRepo.findPostById(postId);
    
    if (!post) {
      throw new NotFoundException('Post not found');
    }

    // Increment view count
    await this.communityRepo.incrementViewCount(postId);

    // Check viewer's vote on the post
    let userVote: 'UPVOTE' | 'DOWNVOTE' | null = null;
    if (viewerId) {
      userVote = await this.communityRepo.getUserVoteOnPost(postId, viewerId);
    }

    return {
      ...post,
      userVote,
    };
  }

  async updatePost(postId: number, userId: number, updatePostDto: UpdatePostDto, isAdmin: boolean = false) {
    const post = await this.communityRepo.findPostById(postId);
    
    if (!post) {
      throw new NotFoundException('Post not found');
    }

    // Only allow owner or admin to edit
    if (post.user_id !== userId && !isAdmin) {
      throw new ForbiddenException('You can only edit your own posts');
    }

    // Only admin can change is_pinned
    if (updatePostDto.is_pinned !== undefined && !isAdmin) {
      throw new ForbiddenException('Only admins can pin/unpin posts');
    }

    return this.communityRepo.updatePost(postId, updatePostDto);
  }

  async deletePost(postId: number, userId: number, isAdmin: boolean = false) {
    const post = await this.communityRepo.findPostById(postId);
    
    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (post.user_id !== userId && !isAdmin) {
      throw new ForbiddenException('You can only delete your own posts');
    }

    return this.communityRepo.deletePost(postId);
  }

  async votePost(postId: number, userId: number, voteType: 'UPVOTE' | 'DOWNVOTE') {
    console.log('=== VOTE POST SERVICE ===');
    console.log('postId:', postId);
    console.log('userId:', userId);
    console.log('voteType:', voteType);
    
    const post = await this.communityRepo.findPostById(postId);
    
    if (!post) {
      throw new NotFoundException('Post not found');
    }

    const result = await this.communityRepo.votePost(postId, userId, voteType);
    console.log('Vote result:', result);
    console.log('=== VOTE POST SERVICE END ===');
    
    return result;
  }

  // ==================== COMMENT METHODS ====================

  async createComment(postId: number, userId: number, createCommentDto: CreateCommentDto) {
    const post = await this.communityRepo.findPostById(postId);
    
    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (post.is_locked) {
      throw new ForbiddenException('This post is locked and cannot accept new comments');
    }

    return this.communityRepo.createComment(
      postId,
      userId,
      createCommentDto.content,
      createCommentDto.parent_id
    );
  }

  async getCommentsByPost(postId: number, viewerId?: number) {
    const comments = await this.communityRepo.findCommentsByPost(postId);

    if (viewerId) {
      // Check viewer's vote on comments
      for (const comment of comments) {
        (comment as any).userVote = await this.communityRepo.getUserVoteOnComment(comment.id, viewerId);
        
        if (comment.Replies) {
          for (const reply of comment.Replies) {
            (reply as any).userVote = await this.communityRepo.getUserVoteOnComment(reply.id, viewerId);
          }
        }
      }
    }

    return comments;
  }

  async updateComment(commentId: number, userId: number, updateCommentDto: UpdateCommentDto) {
    const comment = await this.communityRepo.findCommentById(commentId);
    
    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.user_id !== userId) {
      throw new ForbiddenException('You can only edit your own comments');
    }

    return this.communityRepo.updateComment(commentId, updateCommentDto.content);
  }

  async deleteComment(commentId: number, userId: number, isAdmin: boolean = false) {
    const comment = await this.communityRepo.findCommentById(commentId);
    
    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.user_id !== userId && !isAdmin) {
      throw new ForbiddenException('You can only delete your own comments');
    }

    return this.communityRepo.deleteComment(commentId);
  }

  async voteComment(commentId: number, userId: number, voteType: 'UPVOTE' | 'DOWNVOTE') {
    const comment = await this.communityRepo.findCommentById(commentId);
    
    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    return this.communityRepo.voteComment(commentId, userId, voteType);
  }
}
