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
    ParseIntPipe,
    ConflictException,
    InternalServerErrorException,
    UseGuards,
    Req
} from '@nestjs/common';
import { KanjiListService } from './kanji_list.service';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { 
    CreateKanjiListDto, 
    UpdateKanjiListDto, 
    KanjiListQueryDto, 
    AddKanjiToListDto,
    GenerateJLPTListDto,
    GenerateGradeListDto,
    GenerateFrequencyListDto,
    BulkAddKanjiDto,
} from './dtos';
import { ErrorCode } from 'src/shared/error';
import { JwtGuard } from '../auth/guard/jwt.guard';

@ApiTags('Kanji Lists')
@ApiBearerAuth('access-token')
@Controller('kanji-lists')
export class KanjiListController {
    constructor(private readonly kanjiListService: KanjiListService) {}

    @Get()
    @ApiOperation({ summary: 'Get all kanji lists with filters' })
    async getAll(@Query() query: KanjiListQueryDto) {
        try {
            return await this.kanjiListService.getAll(query);
        } catch (error) {
            throw new InternalServerErrorException({
                code: ErrorCode.DatabaseError,
                message: 'Failed to retrieve kanji lists'
            });
        }
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get kanji list by ID' })
    async getById(
        @Param('id', ParseIntPipe) id: number,
        @Query('include_kanjis') includeKanjis?: string
    ) {
        try {
            const list = await this.kanjiListService.getById(id, includeKanjis === 'true');
            if (!list) {
                throw new NotFoundException({
                    code: ErrorCode.NotFound,
                    message: 'Kanji list not found'
                });
            }
            return list;
        } catch (error) {
            if (error instanceof NotFoundException) {
                throw error;
            }
            throw new InternalServerErrorException({
                code: ErrorCode.DatabaseError,
                message: 'Failed to retrieve kanji list'
            });
        }
    }

    @UseGuards(JwtGuard)
    @Post()
    @ApiOperation({ summary: 'Create new kanji list' })
    async createKanjiList(
        @Body() data: CreateKanjiListDto
    ) {
        try {
            return await this.kanjiListService.createAsync(data);
        } catch (error) {
            if (error.message?.includes('already exists') || error.code === 'P2002') {
                throw new ConflictException({
                    code: ErrorCode.AlreadyExists,
                    message: 'Kanji list with this name already exists'
                });
            }
            throw new BadRequestException({
                code: ErrorCode.BadRequest,
                message: 'Failed to create kanji list'
            });
        }
    }

    @Put(':id')
    @ApiOperation({ summary: 'Update kanji list' })
    async updateKanjiList(
        @Param('id', ParseIntPipe) id: number, 
        @Body() data: UpdateKanjiListDto
    ) {
        try {
            return await this.kanjiListService.updateAsync(id, data);
        } catch (error) {
            if (error.code === 'P2025') {
                throw new NotFoundException({
                    code: ErrorCode.NotFound,
                    message: 'Kanji list not found'
                });
            }
            if (error.message?.includes('already exists') || error.code === 'P2002') {
                throw new ConflictException({
                    code: ErrorCode.AlreadyExists,
                    message: 'Kanji list with this name already exists'
                });
            }
            throw new BadRequestException({
                code: ErrorCode.BadRequest,
                message: 'Failed to update kanji list'
            });
        }
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete kanji list' })
    async deleteKanjiList(@Param('id', ParseIntPipe) id: number) {
        try {
            return await this.kanjiListService.deleteAsync(id);
        } catch (error) {
            if (error.code === 'P2025') {
                throw new NotFoundException({
                    code: ErrorCode.NotFound,
                    message: 'Kanji list not found'
                });
            }
            throw new InternalServerErrorException({
                code: ErrorCode.DatabaseError,
                message: 'Failed to delete kanji list'
            });
        }
    }

    @Post(':id/kanjis')
    @ApiOperation({ summary: 'Add specific kanjis to list' })
    async addKanjis(
        @Param('id', ParseIntPipe) id: number,
        @Body() data: AddKanjiToListDto
    ) {
        try {
            if (!data.kanji_ids || data.kanji_ids.length === 0) {
                throw new BadRequestException({
                    code: ErrorCode.ValidationError,
                    message: 'At least one kanji ID is required'
                });
            }

            const result = await this.kanjiListService.addKanjis(id, data);
            if (!result) {
                throw new NotFoundException({
                    code: ErrorCode.NotFound,
                    message: 'Kanji list not found'
                });
            }
            return result;
        } catch (error) {
            if (error instanceof BadRequestException || error instanceof NotFoundException) {
                throw error;
            }
            throw new BadRequestException({
                code: ErrorCode.BadRequest,
                message: 'Failed to add kanjis to list'
            });
        }
    }

    @Post(':id/kanjis/bulk')
    @ApiOperation({ summary: 'Bulk add kanjis to list based on filters' })
    async bulkAddKanjis(
        @Param('id', ParseIntPipe) id: number,
        @Body() data: BulkAddKanjiDto
    ) {
        try {
            // Validate filters
            if (!data.jlpt && !data.grade && !data.top_frequency && !data.search) {
                throw new BadRequestException({
                    code: ErrorCode.ValidationError,
                    message: 'At least one filter parameter is required'
                });
            }

            if (data.jlpt && (data.jlpt < 1 || data.jlpt > 5)) {
                throw new BadRequestException({
                    code: ErrorCode.InvalidInput,
                    message: 'JLPT level must be between 1 and 5'
                });
            }

            if (data.grade && (data.grade < 1 || data.grade > 6)) {
                throw new BadRequestException({
                    code: ErrorCode.InvalidInput,
                    message: 'Grade level must be between 1 and 6'
                });
            }

            if (data.top_frequency && data.top_frequency <= 0) {
                throw new BadRequestException({
                    code: ErrorCode.InvalidInput,
                    message: 'Frequency count must be greater than 0'
                });
            }

            const result = await this.kanjiListService.bulkAddKanjis(id, data);
            if (!result) {
                throw new NotFoundException({
                    code: ErrorCode.NotFound,
                    message: 'Kanji list not found'
                });
            }
            return result;
        } catch (error) {
            if (error instanceof BadRequestException || error instanceof NotFoundException) {
                throw error;
            }
            throw new InternalServerErrorException({
                code: ErrorCode.DatabaseError,
                message: 'Failed to bulk add kanjis'
            });
        }
    }

    @Delete(':id/kanjis')
    @ApiOperation({ summary: 'Remove kanjis from list' })
    async removeKanjis(
        @Param('id', ParseIntPipe) id: number,
        @Body() data: { kanji_ids: number[] }
    ) {
        try {
            if (!data.kanji_ids || data.kanji_ids.length === 0) {
                throw new BadRequestException({
                    code: ErrorCode.ValidationError,
                    message: 'At least one kanji ID is required'
                });
            }

            const result = await this.kanjiListService.removeKanjis(id, data.kanji_ids);
            if (!result) {
                throw new NotFoundException({
                    code: ErrorCode.NotFound,
                    message: 'Kanji list not found'
                });
            }
            return result;
        } catch (error) {
            if (error instanceof BadRequestException || error instanceof NotFoundException) {
                throw error;
            }
            throw new InternalServerErrorException({
                code: ErrorCode.DatabaseError,
                message: 'Failed to remove kanjis from list'
            });
        }
    }

    // Auto-generate lists
    @Post('generate/jlpt')
    @ApiOperation({ summary: 'Generate JLPT kanji list' })
    async generateJLPTList(@Body() data: GenerateJLPTListDto) {
        try {
            // Validate JLPT level
            if (data.jlpt_level < 1 || data.jlpt_level > 5) {
                throw new BadRequestException({
                    code: ErrorCode.InvalidInput,
                    message: 'JLPT level must be between 1 and 5'
                });
            }

            // TODO: Get user ID from JWT token in real implementation
            const userId = data.is_public ? undefined : 1; // placeholder
            const result = await this.kanjiListService.generateJLPTList(data, userId);
            
            if (!result) {
                throw new BadRequestException({
                    code: ErrorCode.BadRequest,
                    message: 'No kanji found for this JLPT level'
                });
            }
            return result;
        } catch (error) {
            if (error instanceof BadRequestException) {
                throw error;
            }
            if (error.message?.includes('already exists')) {
                throw new ConflictException({
                    code: ErrorCode.AlreadyExists,
                    message: 'JLPT list with this name already exists'
                });
            }
            throw new InternalServerErrorException({
                code: ErrorCode.DatabaseError,
                message: 'Failed to generate JLPT list'
            });
        }
    }

    @Post('generate/grade')
    @ApiOperation({ summary: 'Generate grade kanji list' })
    async generateGradeList(@Body() data: GenerateGradeListDto) {
        try {
            // Validate grade level
            if (data.grade_level < 1 || data.grade_level > 6) {
                throw new BadRequestException({
                    code: ErrorCode.InvalidInput,
                    message: 'Grade level must be between 1 and 6'
                });
            }

            // TODO: Get user ID from JWT token in real implementation
            const userId = data.is_public ? undefined : 1; // placeholder
            const result = await this.kanjiListService.generateGradeList(data, userId);
            
            if (!result) {
                throw new BadRequestException({
                    code: ErrorCode.BadRequest,
                    message: 'No kanji found for this grade level'
                });
            }
            return result;
        } catch (error) {
            if (error instanceof BadRequestException) {
                throw error;
            }
            if (error.message?.includes('already exists')) {
                throw new ConflictException({
                    code: ErrorCode.AlreadyExists,
                    message: 'Grade list with this name already exists'
                });
            }
            throw new InternalServerErrorException({
                code: ErrorCode.DatabaseError,
                message: 'Failed to generate grade list'
            });
        }
    }

    @Post('generate/frequency')
    @ApiOperation({ summary: 'Generate frequency kanji list' })
    async generateFrequencyList(@Body() data: GenerateFrequencyListDto) {
        try {
            // Validate frequency count
            if (data.top_count <= 0) {
                throw new BadRequestException({
                    code: ErrorCode.InvalidInput,
                    message: 'Frequency count must be greater than 0'
                });
            }

            // TODO: Get user ID from JWT token in real implementation
            const userId = data.is_public ? undefined : 1; // placeholder
            const result = await this.kanjiListService.generateFrequencyList(data, userId);
            
            if (!result) {
                throw new BadRequestException({
                    code: ErrorCode.BadRequest,
                    message: 'No kanji found with frequency data'
                });
            }
            return result;
        } catch (error) {
            if (error instanceof BadRequestException) {
                throw error;
            }
            if (error.message?.includes('already exists')) {
                throw new ConflictException({
                    code: ErrorCode.AlreadyExists,
                    message: 'Frequency list with this name already exists'
                });
            }
            throw new InternalServerErrorException({
                code: ErrorCode.DatabaseError,
                message: 'Failed to generate frequency list'
            });
        }
    }
}
