import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../shared/services/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoryService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createCategoryDto: CreateCategoryDto) {
    // Check if category with this name already exists
    const existing = await this.prisma.category.findUnique({
      where: { name: createCategoryDto.name },
    });

    if (existing) {
      throw new ConflictException(
        `Category with name "${createCategoryDto.name}" already exists`,
      );
    }

    const category = await this.prisma.category.create({
      data: createCategoryDto,
    });

    return {
      statusCode: 201,
      message: 'Category created successfully',
      data: category,
    };
  }

  async findAll() {
    const categories = await this.prisma.category.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { kanjiLists: true },
        },
      },
    });

    return {
      statusCode: 200,
      data: categories,
    };
  }

  async findOne(id: number) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        kanjiLists: {
          select: {
            id: true,
            name: true,
            description: true,
            isPublic: true,
          },
          take: 10, // Limit to 10 lists
        },
        _count: {
          select: { kanjiLists: true },
        },
      },
    });

    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    return {
      statusCode: 200,
      data: category,
    };
  }

  async update(id: number, updateCategoryDto: UpdateCategoryDto) {
    // Check if category exists
    const existing = await this.prisma.category.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    // If updating name, check for conflicts
    if (updateCategoryDto.name && updateCategoryDto.name !== existing.name) {
      const nameConflict = await this.prisma.category.findUnique({
        where: { name: updateCategoryDto.name },
      });

      if (nameConflict) {
        throw new ConflictException(
          `Category with name "${updateCategoryDto.name}" already exists`,
        );
      }
    }

    const category = await this.prisma.category.update({
      where: { id },
      data: updateCategoryDto,
    });

    return {
      statusCode: 200,
      message: 'Category updated successfully',
      data: category,
    };
  }

  async remove(id: number) {
    // Check if category exists
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: { kanjiLists: true },
        },
      },
    });

    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    // Check if category has kanji lists
    if (category._count.kanjiLists > 0) {
      throw new ConflictException(
        `Cannot delete category with ${category._count.kanjiLists} kanji list(s). Please reassign or delete the lists first.`,
      );
    }

    await this.prisma.category.delete({
      where: { id },
    });

    return {
      statusCode: 200,
      message: 'Category deleted successfully',
    };
  }
}
