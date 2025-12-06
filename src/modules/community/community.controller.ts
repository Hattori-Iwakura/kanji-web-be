import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  ParseIntPipe,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { CommunityService } from './community.service';
import { CreatePostDto } from './dtos/create-post.dto';
import { UpdatePostDto } from './dtos/update-post.dto';
import { CreateCommentDto } from './dtos/create-comment.dto';
import { UpdateCommentDto } from './dtos/update-comment.dto';
import { JwtGuard } from '../auth/guard/jwt.guard';
import { OptionalJwtGuard } from '../auth/guard/optional-jwt.guard';
import { PostCategory } from 'generated/prisma';

@Controller('community')
export class CommunityController {
  constructor(private communityService: CommunityService) {}

  // ==================== POST ENDPOINTS ====================

  @Post('upload-attachments')
  @UseGuards(JwtGuard)
  @UseInterceptors(
    FilesInterceptor('attachments', 10, {
      storage: diskStorage({
        destination: './uploads/community',
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.]/g, '_');
          cb(null, `${uniqueSuffix}-${sanitizedName}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        // Allow images and common document types
        const allowedMimeTypes = [
          'image/jpeg',
          'image/jpg',
          'image/png',
          'image/gif',
          'image/webp',
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'text/plain',
        ];
        if (allowedMimeTypes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new BadRequestException('File type not allowed. Allowed types: images, PDF, Word, Excel, TXT'), false);
        }
      },
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB per file
      },
    }),
  )
  async uploadAttachments(@Req() req: any, @UploadedFiles() files: Express.Multer.File[]) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files uploaded');
    }

    const protocol = req.protocol;
    const host = req.get('host');
    const fileUrls = files.map(file => `${protocol}://${host}/uploads/community/${file.filename}`);

    return { urls: fileUrls };
  }

  @Post('posts')
  @UseGuards(JwtGuard)
  async createPost(@Req() req: any, @Body() createPostDto: CreatePostDto) {
    const userId = req.user.id;
    return this.communityService.createPost(userId, createPostDto);
  }

  @Get('posts')
  @UseGuards(OptionalJwtGuard)
  async getPosts(
    @Req() req: any,
    @Query('category') category?: PostCategory,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('offset', new ParseIntPipe({ optional: true })) offset?: number,
    @Query('userId', new ParseIntPipe({ optional: true })) userId?: number,
    @Query('search') search?: string,
  ) {
    // Get viewerId from JWT token if user is logged in
    const viewerId = req.user?.id;
    console.log('GET /posts - viewerId from JWT:', viewerId);
    console.log('GET /posts - query userId:', userId);
    console.log('GET /posts - category:', category);
    
    return this.communityService.getPosts({ 
      category, 
      limit, 
      offset, 
      userId, 
      search,
      viewerId // Pass viewerId for vote information
    });
  }

  @Get('posts/:id')
  async getPostById(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const viewerId = req.user?.id;
    return this.communityService.getPostById(id, viewerId);
  }

  @Put('posts/:id')
  @UseGuards(JwtGuard)
  async updatePost(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
    @Body() updatePostDto: UpdatePostDto,
  ) {
    console.log('Update post DTO:', updatePostDto);
    console.log('Update post DTO type:', typeof updatePostDto);
    console.log('is_pinned value:', updatePostDto.is_pinned);
    console.log('is_pinned type:', typeof updatePostDto.is_pinned);
    
    const userId = req.user.id;
    const isAdmin = req.user.role === 'ADMIN';
    return this.communityService.updatePost(id, userId, updatePostDto, isAdmin);
  }

  @Delete('posts/:id')
  @UseGuards(JwtGuard)
  async deletePost(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const userId = req.user.id;
    const isAdmin = req.user.role === 'ADMIN';
    return this.communityService.deletePost(id, userId, isAdmin);
  }

  @Post('posts/:id/vote/:voteType')
  @UseGuards(JwtGuard)
  async votePost(
    @Param('id', ParseIntPipe) id: number,
    @Param('voteType') voteType: string,
    @Req() req: any
  ) {
    const userId = req.user.id;
    if (voteType !== 'UPVOTE' && voteType !== 'DOWNVOTE') {
      throw new Error('Invalid vote type');
    }
    return this.communityService.votePost(id, userId, voteType as 'UPVOTE' | 'DOWNVOTE');
  }

  // ==================== COMMENT ENDPOINTS ====================

  @Post('posts/:postId/comments')
  @UseGuards(JwtGuard)
  async createComment(
    @Param('postId', ParseIntPipe) postId: number,
    @Req() req: any,
    @Body() createCommentDto: CreateCommentDto,
  ) {
    const userId = req.user.id;
    return this.communityService.createComment(postId, userId, createCommentDto);
  }

  @Get('posts/:postId/comments')
  @UseGuards(OptionalJwtGuard)
  async getComments(@Param('postId', ParseIntPipe) postId: number, @Req() req: any) {
    const viewerId = req.user?.id;
    return this.communityService.getCommentsByPost(postId, viewerId);
  }

  @Put('comments/:id')
  @UseGuards(JwtGuard)
  async updateComment(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
    @Body() updateCommentDto: UpdateCommentDto,
  ) {
    const userId = req.user.id;
    return this.communityService.updateComment(id, userId, updateCommentDto);
  }

  @Delete('comments/:id')
  @UseGuards(JwtGuard)
  async deleteComment(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const userId = req.user.id;
    const isAdmin = req.user.role === 'ADMIN';
    return this.communityService.deleteComment(id, userId, isAdmin);
  }

  @Post('comments/:id/vote/:voteType')
  @UseGuards(JwtGuard)
  async voteComment(
    @Param('id', ParseIntPipe) id: number,
    @Param('voteType') voteType: string,
    @Req() req: any
  ) {
    const userId = req.user.id;
    if (voteType !== 'UPVOTE' && voteType !== 'DOWNVOTE') {
      throw new Error('Invalid vote type');
    }
    return this.communityService.voteComment(id, userId, voteType as 'UPVOTE' | 'DOWNVOTE');
  }
}
