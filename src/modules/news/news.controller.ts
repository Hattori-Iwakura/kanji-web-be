import { Controller, Get, Query, UseGuards, Param, Post, Body } from '@nestjs/common';
import { NewsService, NewsLevel } from './news.service';
import { JwtGuard } from '../auth/guard/jwt.guard';

@Controller('news')
export class NewsController {
  constructor(private readonly newsService: NewsService) {}

  @Get('easy-news')
  async getEasyNews() {
    return this.newsService.getFormattedNews('all', 20, 1);
  }

  @Get('normal-news')
  async getNormalNews() {
    return this.newsService.getFormattedNews('all', 20, 1);
  }

  @Get()
  @UseGuards(JwtGuard)
  async getNews(
    @Query('category') category?: string,
    @Query('limit') limit?: string,
    @Query('page') page?: string,
    @Query('level') level?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 20;
    const pageNum = page ? parseInt(page, 10) : 1;
    
    return this.newsService.getFormattedNews(category, limitNum, pageNum, level);
  }

  @Get('categories')
  @UseGuards(JwtGuard)
  async getCategories() {
    return this.newsService.getCategories();
  }

  @Get('levels')
  @UseGuards(JwtGuard)
  async getLevels() {
    return this.newsService.getLevels();
  }

  @Get(':id/furigana')
  @UseGuards(JwtGuard)
  async getArticleWithFurigana(@Param('id') id: string) {
    return this.newsService.getArticleWithFurigana(id);
  }

  @Get(':id/tts')
  @UseGuards(JwtGuard)
  async generateTTS(@Param('id') id: string) {
    try {
      const audioUrl = await this.newsService.generateTTSAudio(id);
      return {
        success: true,
        data: {
          audioUrl: audioUrl,
          method: audioUrl === 'client-side-tts' ? 'browser' : 'server',
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  @Get(':id')
  @UseGuards(JwtGuard)
  async getArticleById(@Param('id') id: string) {
    return this.newsService.getArticleById(id);
  }

  @Post('convert-furigana')
  @UseGuards(JwtGuard)
  async convertTextToFurigana(@Body('text') text: string) {
    const result = await this.newsService.convertTextToFurigana(text);
    return { text: result };
  }
}
