// src/controllers/category.controller.ts

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CategoryService } from '../services/category.service';
import { Category } from '../entities/category.entity';

@ApiTags('Categories')
@Controller('categories')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @ApiOperation({ summary: 'Create a new Category' })
  @ApiResponse({ status: 201, description: 'Category created successfully.' })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  @Post()
  async createCategory(@Body() data: Partial<Category>): Promise<Category> {
    try {
      return await this.categoryService.createCategory(data);
    } catch (error) {
      throw new HttpException(
        'Failed to create Category record.',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @ApiOperation({ summary: 'Find a Category by ID' })
  @ApiResponse({ status: 200, description: 'Category found.' })
  @ApiResponse({ status: 404, description: 'Category not found.' })
  @Get(':id')
  async findCategory(@Param('id') id: number): Promise<Category> {
    try {
      const category = await this.categoryService.findCategory(id);
      if (!category) {
        throw new HttpException('Category not found.', HttpStatus.NOT_FOUND);
      }
      return category;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to find Category record.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @ApiOperation({ summary: 'Update a Category by ID' })
  @ApiResponse({ status: 200, description: 'Category updated successfully.' })
  @ApiResponse({ status: 404, description: 'Category not found.' })
  @Put(':id')
  async updateCategory(
    @Param('id') id: number,
    @Body() updatedData: Partial<Category>,
  ): Promise<Category> {
    try {
      const updatedCategory = await this.categoryService.updateCategory(
        id,
        updatedData,
      );
      if (!updatedCategory) {
        throw new HttpException('Category not found.', HttpStatus.NOT_FOUND);
      }
      return updatedCategory;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to update Category record.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @ApiOperation({ summary: 'Delete a Category by ID' })
  @ApiResponse({ status: 204, description: 'Category deleted successfully.' })
  @ApiResponse({ status: 404, description: 'Category not found.' })
  @Delete(':id')
  async deleteCategory(@Param('id') id: number): Promise<void> {
    try {
      const deleted = await this.categoryService.deleteCategory(id);
      if (!deleted) {
        throw new HttpException('Category not found.', HttpStatus.NOT_FOUND);
      }
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to delete Category record.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @ApiOperation({ summary: 'Get all Categories' })
  @ApiResponse({
    status: 200,
    description: 'Categories retrieved successfully.',
  })
  @Get()
  async getAllCategories(): Promise<Category[]> {
    try {
      return await this.categoryService.getAllCategories();
    } catch (error) {
      throw new HttpException(
        'Failed to retrieve Categories.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
