import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  ValidationPipe,
  UseGuards,
  Req,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { QuizService } from './quiz.service';
import {
  CreateQuizDto,
  UpdateQuizDto,
  CreateQuestionDto,
  UpdateQuestionDto,
  BulkCreateQuestionsDto,
  QuizQueryDto,
  SubmitQuizDto,
  QuizResultQueryDto,
} from './dtos';
import { JwtGuard } from '../auth/guard/jwt.guard';
import { ErrorCode } from 'src/shared/error';

@ApiTags('Quiz')
@Controller('quiz')
export class QuizController {
  constructor(private readonly quizService: QuizService) {}

  // Quiz endpoints
  @Get()
  @ApiOperation({ summary: 'Lấy danh sách quiz' })
  @ApiResponse({ status: 200, description: 'Danh sách quiz' })
  async getAllQuizzes(@Query() query: QuizQueryDto) {
    try {
      return await this.quizService.findAllQuizzes(query);
    } catch (error) {
      throw new BadRequestException({
        code: ErrorCode.BadRequest,
        message: 'Failed to retrieve quizzes',
      });
    }
  }

  @Get('results')
  @ApiOperation({ summary: 'Lấy danh sách kết quả quiz' })
  @ApiResponse({ status: 200, description: 'Danh sách kết quả' })
  async getResults(@Query() query: any) {
    try {
      return await this.quizService.findResults(query);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException({
        code: ErrorCode.BadRequest,
        message: 'Failed to retrieve results',
      });
    }
  }

  @Get('result/:id')
  @ApiOperation({ summary: 'Lấy thông tin kết quả quiz theo ID' })
  @ApiResponse({ status: 200, description: 'Thông tin kết quả' })
  @ApiResponse({ status: 404, description: 'Kết quả không tồn tại' })
  async getResultById(@Param('id', ParseIntPipe) id: number) {
    const result = await this.quizService.findResultById(id);
    if (!result) {
      throw new NotFoundException({
        code: ErrorCode.NotFound,
        message: 'Quiz result not found',
      });
    }
    return result;
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy thông tin quiz theo ID' })
  @ApiResponse({ status: 200, description: 'Thông tin quiz' })
  @ApiResponse({ status: 404, description: 'Quiz không tồn tại' })
  async getQuizById(
    @Param('id', ParseIntPipe) id: number,
    @Query('include_questions') includeQuestions?: string,
  ) {
    const quiz = await this.quizService.findQuizById(id, includeQuestions === 'true');
    if (!quiz) {
      throw new NotFoundException({
        code: ErrorCode.NotFound,
        message: 'Quiz not found',
      });
    }
    return quiz;
  }

  @UseGuards(JwtGuard)
  @Post()
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Tạo quiz mới' })
  @ApiResponse({ status: 201, description: 'Quiz đã được tạo' })
  async createQuiz(@Body() data: CreateQuizDto, @Req() req: any) {
    try {
      // TODO: Lấy user_id từ JWT token
      const userId = req.user?.id; // Nếu có JWT guard
      return await this.quizService.createQuiz(data, userId);
    } catch (error) {
      throw new BadRequestException({
        code: ErrorCode.BadRequest,
        message: error.message || 'Failed to create quiz',
      });
    }
  }

  @UseGuards(JwtGuard)
  @Put(':id')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Cập nhật quiz' })
  @ApiResponse({ status: 200, description: 'Quiz đã được cập nhật' })
  @ApiResponse({ status: 404, description: 'Quiz không tồn tại' })
  async updateQuiz(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: UpdateQuizDto,
  ) {
    try {
      return await this.quizService.updateQuiz(id, data);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException({
        code: ErrorCode.BadRequest,
        message: error.message || 'Failed to update quiz',
      });
    }
  }

  @UseGuards(JwtGuard)
  @Delete(':id')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Xóa quiz' })
  @ApiResponse({ status: 200, description: 'Quiz đã được xóa' })
  @ApiResponse({ status: 404, description: 'Quiz không tồn tại' })
  async deleteQuiz(@Param('id', ParseIntPipe) id: number) {
    try {
      return await this.quizService.deleteQuiz(id);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException({
        code: ErrorCode.BadRequest,
        message: error.message || 'Failed to delete quiz',
      });
    }
  }

  // Question endpoints
  @Get(':quizId/questions')
  @ApiOperation({ summary: 'Lấy danh sách câu hỏi của quiz' })
  @ApiResponse({ status: 200, description: 'Danh sách câu hỏi' })
  async getQuestions(@Param('quizId', ParseIntPipe) quizId: number) {
    return await this.quizService.findQuestionsByQuizId(quizId);
  }

  @Get('questions/:id')
  @ApiOperation({ summary: 'Lấy thông tin câu hỏi theo ID' })
  @ApiResponse({ status: 200, description: 'Thông tin câu hỏi' })
  @ApiResponse({ status: 404, description: 'Câu hỏi không tồn tại' })
  async getQuestionById(@Param('id', ParseIntPipe) id: number) {
    const question = await this.quizService.findQuestionById(id);
    if (!question) {
      throw new NotFoundException({
        code: ErrorCode.NotFound,
        message: 'Question not found',
      });
    }
    return question;
  }

  @UseGuards(JwtGuard)
  @Post(':quizId/questions')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Thêm câu hỏi vào quiz' })
  @ApiResponse({ status: 201, description: 'Câu hỏi đã được tạo' })
  async createQuestion(
    @Param('quizId', ParseIntPipe) quizId: number,
    @Body() data: CreateQuestionDto,
  ) {
    try {
      return await this.quizService.createQuestion(quizId, data);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException({
        code: ErrorCode.BadRequest,
        message: error.message || 'Failed to create question',
      });
    }
  }

  @UseGuards(JwtGuard)
  @Post(':quizId/questions/bulk')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Thêm nhiều câu hỏi cùng lúc' })
  @ApiResponse({ status: 201, description: 'Các câu hỏi đã được tạo' })
  async bulkCreateQuestions(
    @Param('quizId', ParseIntPipe) quizId: number,
    @Body() data: BulkCreateQuestionsDto,
  ) {
    try {
      const count = await this.quizService.bulkCreateQuestions(quizId, data.questions);
      return {
        message: `Created ${count} questions successfully`,
        count,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException({
        code: ErrorCode.BadRequest,
        message: error.message || 'Failed to create questions',
      });
    }
  }

  @UseGuards(JwtGuard)
  @Put('questions/:id')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Cập nhật câu hỏi' })
  @ApiResponse({ status: 200, description: 'Câu hỏi đã được cập nhật' })
  @ApiResponse({ status: 404, description: 'Câu hỏi không tồn tại' })
  async updateQuestion(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: UpdateQuestionDto,
  ) {
    try {
      return await this.quizService.updateQuestion(id, data);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException({
        code: ErrorCode.BadRequest,
        message: error.message || 'Failed to update question',
      });
    }
  }

  @UseGuards(JwtGuard)
  @Delete('questions/:id')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Xóa câu hỏi' })
  @ApiResponse({ status: 200, description: 'Câu hỏi đã được xóa' })
  @ApiResponse({ status: 404, description: 'Câu hỏi không tồn tại' })
  async deleteQuestion(@Param('id', ParseIntPipe) id: number) {
    try {
      return await this.quizService.deleteQuestion(id);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException({
        code: ErrorCode.BadRequest,
        message: error.message || 'Failed to delete question',
      });
    }
  }

  // Quiz submission and results
  @UseGuards(JwtGuard)
  @Post(':quizId/submit')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Nộp bài quiz' })
  @ApiResponse({ status: 201, description: 'Kết quả quiz' })
  async submitQuiz(
    @Param('quizId', ParseIntPipe) quizId: number,
    @Body() data: SubmitQuizDto,
    @Req() req: any,
  ) {
    try {
      // TODO: Lấy user_id từ JWT token
      const userId = req.user?.id || 1; // placeholder
      return await this.quizService.submitQuiz(quizId, userId, data);
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException({
        code: ErrorCode.BadRequest,
        message: error.message || 'Failed to submit quiz',
      });
    }
  }

  @UseGuards(JwtGuard)
  @Get(':quizId/my-results')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Lấy kết quả quiz của user hiện tại' })
  @ApiResponse({ status: 200, description: 'Danh sách kết quả' })
  async getMyResults(
    @Param('quizId', ParseIntPipe) quizId: number,
    @Req() req: any,
  ) {
    try {
      // TODO: Lấy user_id từ JWT token
      const userId = req.user?.id || 1; // placeholder
      return await this.quizService.findUserResultsForQuiz(userId, quizId);
    } catch (error) {
      throw new BadRequestException({
        code: ErrorCode.BadRequest,
        message: 'Failed to retrieve your results',
      });
    }
  }
}
