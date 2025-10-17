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
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { QuizService } from './quiz.service';
import { CreateQuizDto, CreateQuestionDto, StartQuizDto, SubmitAnswerDto, UpdateQuizDto } from './dto';
import { JwtGuard } from '../auth/guard/jwt.guard';
import { QuizDifficulty } from 'generated/prisma';

@ApiTags('Quiz')
@Controller('quiz')
@UseGuards(JwtGuard)
@ApiBearerAuth('access-token')
export class QuizController {
  constructor(private readonly quizService: QuizService) {}

  @Post()
  async createQuiz(
    @Req() req: any,
    @Body() data: CreateQuizDto,
  ) {
    const userId = req.user?.id;
    return this.quizService.createQuiz(userId, data);
  }

  @Get()
  async getAllQuizzes(
    @Req() req: any,
    @Query('my_quizzes') myQuizzes?: string,
    @Query('public') isPublic?: string,
    @Query('category') category?: string,
    @Query('difficulty') difficulty?: QuizDifficulty,
  ) {
    const userId = req.user?.id;
    // If myQuizzes=true, show user's quizzes; if public=true, show public quizzes
    const filterUserId = myQuizzes === 'true' ? userId : undefined;
    const filterPublic = isPublic === 'true' ? true : undefined;
    
    return this.quizService.getAllQuizzes(filterUserId, filterPublic, category, difficulty);
  }

  @Get(':id')
  async getQuizById(
    @Req() req: any,
    @Param('id', ParseIntPipe) quizId: number,
  ) {
    const userId = req.user?.id;
    return this.quizService.getQuizById(quizId, userId);
  }

  @Put(':id')
  async updateQuiz(
    @Req() req: any,
    @Param('id', ParseIntPipe) quizId: number,
    @Body() data: UpdateQuizDto,
  ) {
    const userId = req.user?.id;
    return this.quizService.updateQuiz(quizId, userId, data);
  }

  @Delete(':id')
  async deleteQuiz(
    @Req() req: any,
    @Param('id', ParseIntPipe) quizId: number,
  ) {
    const userId = req.user?.id;
    return this.quizService.deleteQuiz(quizId, userId);
  }

  @Post(':id/question')
  async addQuestion(
    @Req() req: any,
    @Param('id', ParseIntPipe) quizId: number,
    @Body() data: CreateQuestionDto,
  ) {
    const userId = req.user?.id;
    return this.quizService.addQuestion(quizId, userId, data);
  }

  @Delete('question/:id')
  async deleteQuestion(
    @Req() req: any,
    @Param('id', ParseIntPipe) questionId: number,
  ) {
    const userId = req.user?.id;
    return this.quizService.deleteQuestion(questionId, userId);
  }

  @Post('start')
  async startQuiz(
    @Req() req: any,
    @Body('quiz_id', ParseIntPipe) quizId: number,
  ) {
    const userId = req.user?.id;
    return this.quizService.startQuiz(userId, quizId);
  }

  @Post('answer')
  async submitAnswer(
    @Req() req: any,
    @Body() data: SubmitAnswerDto,
  ) {
    const userId = req.user?.id;
    return this.quizService.submitAnswer(userId, data);
  }

  @Get('attempt/:id')
  async getAttemptResults(
    @Req() req: any,
    @Param('id', ParseIntPipe) attemptId: number,
  ) {
    const userId = req.user?.id;
    return this.quizService.getAttemptResults(attemptId, userId);
  }

  @Get('my-attempts')
  async getUserAttempts(
    @Req() req: any,
    @Query('quiz_id', new ParseIntPipe({ optional: true })) quizId?: number,
  ) {
    const userId = req.user?.id;
    return this.quizService.getUserAttempts(userId, quizId);
  }

  @Get(':id/statistics')
  async getQuizStatistics(
    @Req() req: any,
    @Param('id', ParseIntPipe) quizId: number,
  ) {
    const userId = req.user?.id;
    return this.quizService.getQuizStatistics(quizId, userId);
  }
}
