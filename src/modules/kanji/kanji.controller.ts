import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { KanjiService } from './kanji.service';
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard';
import { RolesGuard } from '../auth/guard/roles.guard';
import { Roles } from '../auth/decorator/roles.decorator';

@Controller('kanji')
export class KanjiController {
  constructor(private readonly kanjiService: KanjiService) {}

  @Get('search')
  async search(
    @Query('query') query?: string,
    @Query('jlptLevels') jlptLevels?: string,
    @Query('grades') grades?: string,
    @Query('minStrokes') minStrokes?: string,
    @Query('maxStrokes') maxStrokes?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
  ) {
    const jlptArray = jlptLevels ? jlptLevels.split(',').map(Number) : undefined;
    const gradesArray = grades ? grades.split(',').map(Number) : undefined;

    return this.kanjiService.searchKanji({
      query,
      jlptLevels: jlptArray,
      grades: gradesArray,
      minStrokes: minStrokes ? parseInt(minStrokes) : undefined,
      maxStrokes: maxStrokes ? parseInt(maxStrokes) : undefined,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
      sortBy,
    });
  }

  @Get()
  async findAll(
    @Query('jlpt') jlpt?: string,
    @Query('grade') grade?: string,
    @Query('search') search?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.kanjiService.findAll({
      jlpt: jlpt ? parseInt(jlpt) : undefined,
      grade: grade ? parseInt(grade) : undefined,
      search,
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined,
    });
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.kanjiService.findOne(parseInt(id));
  }

  @Get('character/:character')
  async findByCharacter(@Param('character') character: string) {
    return this.kanjiService.findByCharacter(character);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async create(
    @Body() body: { character: string; meanings: string; onyomi?: string; kunyomi?: string; jlpt?: number; grade?: number; strokeCount?: number; frequency?: number },
    @Request() req,
  ) {
    return this.kanjiService.create(body);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async update(
    @Param('id') id: string,
    @Body() body: { meanings?: string; onyomi?: string; kunyomi?: string; jlpt?: number; grade?: number; strokeCount?: number; frequency?: number },
    @Request() req,
  ) {
    return this.kanjiService.update(parseInt(id), body);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async delete(@Param('id') id: string, @Request() req) {
    return this.kanjiService.delete(parseInt(id));
  }
}
