import { 
    BadRequestException, 
    Body, 
    Controller, 
    Get, 
    Param, 
    Post, 
    Put, 
    Delete, 
    NotFoundException, 
    Query, 
    ParseIntPipe 
} from '@nestjs/common';
import { KanjiListService } from './kanji_list.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { 
    CreateKanjiListDto, 
    UpdateKanjiListDto, 
    KanjiListQueryDto, 
    AddKanjiToListDto,
    GenerateJLPTListDto,
    GenerateGradeListDto,
    GenerateFrequencyListDto,
    BulkAddKanjiDto
} from './dtos';
import { ErrorCode } from 'src/shared/error';

@ApiTags('Kanji Lists')
@Controller('kanji-lists')
export class KanjiListController {
    constructor(private readonly kanjiListService: KanjiListService) {}

    @Get()
    @ApiOperation({ summary: 'Get all kanji lists with filters' })
    async getAll(@Query() query: KanjiListQueryDto) {
        return this.kanjiListService.getAll(query);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get kanji list by ID' })
    async getById(
        @Param('id', ParseIntPipe) id: number,
        @Query('include_kanjis') includeKanjis?: string
    ) {
        const list = await this.kanjiListService.getById(id, includeKanjis === 'true');
        if (!list) {
            throw new NotFoundException(ErrorCode.Not_Found);
        }
        return list;
    }

    @Post()
    @ApiOperation({ summary: 'Create new kanji list' })
    async createKanjiList(@Body() data: CreateKanjiListDto) {
        return this.kanjiListService.createAsync(data);
    }

    @Put(':id')
    @ApiOperation({ summary: 'Update kanji list' })
    async updateKanjiList(
        @Param('id', ParseIntPipe) id: number, 
        @Body() data: UpdateKanjiListDto
    ) {
        return this.kanjiListService.updateAsync(id, data);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete kanji list' })
    async deleteKanjiList(@Param('id', ParseIntPipe) id: number) {
        return this.kanjiListService.deleteAsync(id);
    }

    @Post(':id/kanjis')
    @ApiOperation({ summary: 'Add specific kanjis to list' })
    async addKanjis(
        @Param('id', ParseIntPipe) id: number,
        @Body() data: AddKanjiToListDto
    ) {
        return this.kanjiListService.addKanjis(id, data);
    }

    @Post(':id/kanjis/bulk')
    @ApiOperation({ summary: 'Bulk add kanjis to list based on filters' })
    async bulkAddKanjis(
        @Param('id', ParseIntPipe) id: number,
        @Body() data: BulkAddKanjiDto
    ) {
        return this.kanjiListService.bulkAddKanjis(id, data);
    }

    @Delete(':id/kanjis')
    @ApiOperation({ summary: 'Remove kanjis from list' })
    async removeKanjis(
        @Param('id', ParseIntPipe) id: number,
        @Body() data: { kanji_ids: number[] }
    ) {
        return this.kanjiListService.removeKanjis(id, data.kanji_ids);
    }

    // Auto-generate lists
    @Post('generate/jlpt')
    @ApiOperation({ summary: 'Generate JLPT kanji list' })
    async generateJLPTList(@Body() data: GenerateJLPTListDto) {
        // TODO: Get user ID from JWT token in real implementation
        const userId = data.is_public ? undefined : 1; // placeholder
        return this.kanjiListService.generateJLPTList(data, userId);
    }

    @Post('generate/grade')
    @ApiOperation({ summary: 'Generate grade kanji list' })
    async generateGradeList(@Body() data: GenerateGradeListDto) {
        // TODO: Get user ID from JWT token in real implementation
        const userId = data.is_public ? undefined : 1; // placeholder
        return this.kanjiListService.generateGradeList(data, userId);
    }

    @Post('generate/frequency')
    @ApiOperation({ summary: 'Generate frequency kanji list' })
    async generateFrequencyList(@Body() data: GenerateFrequencyListDto) {
        // TODO: Get user ID from JWT token in real implementation
        const userId = data.is_public ? undefined : 1; // placeholder
        return this.kanjiListService.generateFrequencyList(data, userId);
    }
}
