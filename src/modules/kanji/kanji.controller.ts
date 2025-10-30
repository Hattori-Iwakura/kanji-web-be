import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request, HttpException, HttpStatus, BadRequestException } from '@nestjs/common';
import { KanjiService } from './kanji.service';
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard';
import { RolesGuard } from '../auth/guard/roles.guard';
import { Roles } from '../auth/decorator/roles.decorator';
import { SearchKanjiDto, SearchByCanvasDto, FindAllKanjiDto } from './dto';

@Controller('kanji')
export class KanjiController {
  constructor(private readonly kanjiService: KanjiService) {}

  @Get('search')
  async search(@Query() searchDto: SearchKanjiDto) {
    return this.kanjiService.searchKanji(searchDto);
  }

  @Post('search/canvas')
  @UseGuards(JwtAuthGuard)
  async searchByCanvas(@Body() body: SearchByCanvasDto, @Request() req) {
    return this.kanjiService.searchByCanvas(body.image);
  }

  @Get()
  async findAll(@Query() findAllDto: FindAllKanjiDto) {
    return this.kanjiService.findAll(findAllDto);
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
    try {
      return await this.kanjiService.create(body);
    } catch (error) {
      if (error.message.includes('already exists')) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
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
