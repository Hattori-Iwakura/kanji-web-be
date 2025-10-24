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
import { QuizService } from './quiz.service';
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard';
import { AdminGuard } from '../auth/guard/admin.guard';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { SubmitQuizDto } from './dto/submit-answer.dto';
import { CreatePublishRequestDto } from './dto/create-publish-request.dto';
import { ReviewPublishRequestDto } from './dto/review-publish-request.dto';

@Controller('quizzes')
export class QuizController {
  constructor(private readonly quizService: QuizService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll(
    @Req() req: any,
    @Query('search') search?: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('offset', new ParseIntPipe({ optional: true })) offset?: number,
  ) {
    const userId = req.user.id;
    return this.quizService.findAll(userId, { search, limit, offset });
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const userId = req.user.id;
    return this.quizService.findOne(id, userId);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(
    @Req() req: any,
    @Body() body: { title: string; description?: string },
  ) {
    return this.quizService.create(req.user.id, body);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
    @Body() body: { title?: string; description?: string; isPublic?: boolean },
  ) {
    return this.quizService.update(id, req.user.id, body);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  delete(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.quizService.delete(id, req.user.id);
  }

  // ============ QUESTION MANAGEMENT ============

  @Post(':id/questions')
  @UseGuards(JwtAuthGuard)
  addQuestion(
    @Param('id', ParseIntPipe) quizId: number,
    @Req() req: any,
    @Body() body: CreateQuestionDto,
  ) {
    return this.quizService.addQuestion(quizId, req.user.id, body);
  }

  @Put(':id/questions/:questionId')
  @UseGuards(JwtAuthGuard)
  updateQuestion(
    @Param('id', ParseIntPipe) quizId: number,
    @Param('questionId', ParseIntPipe) questionId: number,
    @Req() req: any,
    @Body() body: UpdateQuestionDto,
  ) {
    return this.quizService.updateQuestion(quizId, questionId, req.user.id, body);
  }

  @Delete(':id/questions/:questionId')
  @UseGuards(JwtAuthGuard)
  deleteQuestion(
    @Param('id', ParseIntPipe) quizId: number,
    @Param('questionId', ParseIntPipe) questionId: number,
    @Req() req: any,
  ) {
    return this.quizService.deleteQuestion(quizId, questionId, req.user.id);
  }

  @Put(':id/questions/reorder')
  @UseGuards(JwtAuthGuard)
  reorderQuestions(
    @Param('id', ParseIntPipe) quizId: number,
    @Req() req: any,
    @Body() body: { questionOrders: { id: number; order: number }[] },
  ) {
    return this.quizService.reorderQuestions(quizId, req.user.id, body.questionOrders);
  }

  // ============ QUIZ ATTEMPTS ============

  @Post(':id/start')
  @UseGuards(JwtAuthGuard)
  startQuizAttempt(@Param('id', ParseIntPipe) quizId: number, @Req() req: any) {
    return this.quizService.startQuizAttempt(quizId, req.user.id);
  }

  @Post('attempts/:attemptId/submit')
  @UseGuards(JwtAuthGuard)
  submitQuizAttempt(
    @Param('attemptId', ParseIntPipe) attemptId: number,
    @Req() req: any,
    @Body() body: SubmitQuizDto,
  ) {
    return this.quizService.submitQuizAttempt(attemptId, req.user.id, body.answers);
  }

  @Get(':id/attempts')
  @UseGuards(JwtAuthGuard)
  getQuizAttempts(@Param('id', ParseIntPipe) quizId: number, @Req() req: any) {
    return this.quizService.getQuizAttempts(quizId, req.user.id);
  }

  @Get('attempts/:attemptId')
  @UseGuards(JwtAuthGuard)
  getQuizAttemptDetails(@Param('attemptId', ParseIntPipe) attemptId: number, @Req() req: any) {
    return this.quizService.getQuizAttemptDetails(attemptId, req.user.id);
  }

  // ============ PUBLISH REQUEST ============

  @Post(':id/publish-request')
  @UseGuards(JwtAuthGuard)
  requestPublish(
    @Param('id', ParseIntPipe) quizId: number,
    @Req() req: any,
    @Body() body: CreatePublishRequestDto,
  ) {
    return this.quizService.requestPublish(quizId, req.user.id, body.message);
  }

  @Get('admin/publish-requests')
  @UseGuards(JwtAuthGuard, AdminGuard)
  getPendingPublishRequests() {
    return this.quizService.getPendingPublishRequests();
  }

  @Put('admin/publish-requests/:requestId')
  @UseGuards(JwtAuthGuard, AdminGuard)
  reviewPublishRequest(
    @Param('requestId', ParseIntPipe) requestId: number,
    @Req() req: any,
    @Body() body: ReviewPublishRequestDto,
  ) {
    const adminId = req.user.id;
    if (body.action === 'approve') {
      return this.quizService.approvePublishRequest(requestId, adminId);
    } else {
      return this.quizService.rejectPublishRequest(requestId, adminId);
    }
  }
}
