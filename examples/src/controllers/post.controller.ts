// src/controllers/post.controller.ts

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
import { PostService } from '../services/post.service';
import { Post as BlogPost } from '../entities/post.entity';

@ApiTags('Posts')
@Controller('posts')
export class PostController {
  constructor(private readonly postService: PostService) {}

  @ApiOperation({ summary: 'Create a new Post' })
  @ApiResponse({ status: 201, description: 'Post created successfully.' })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  @Post()
  async createPost(@Body() data: Partial<BlogPost>): Promise<BlogPost> {
    try {
      return await this.postService.createPost(data);
    } catch (error) {
      throw new HttpException(
        'Failed to create Post record.',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @ApiOperation({ summary: 'Find a Post by ID' })
  @ApiResponse({ status: 200, description: 'Post found.' })
  @ApiResponse({ status: 404, description: 'Post not found.' })
  @Get(':id')
  async findPost(@Param('id') id: number): Promise<BlogPost> {
    try {
      const post = await this.postService.findPost(id);
      if (!post) {
        throw new HttpException('Post not found.', HttpStatus.NOT_FOUND);
      }
      return post;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to find Post record.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @ApiOperation({ summary: 'Update a Post by ID' })
  @ApiResponse({ status: 200, description: 'Post updated successfully.' })
  @ApiResponse({ status: 404, description: 'Post not found.' })
  @Put(':id')
  async updatePost(
    @Param('id') id: number,
    @Body() updatedData: Partial<BlogPost>,
  ): Promise<BlogPost> {
    try {
      const updatedPost = await this.postService.updatePost(id, updatedData);
      if (!updatedPost) {
        throw new HttpException('Post not found.', HttpStatus.NOT_FOUND);
      }
      return updatedPost;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to update Post record.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @ApiOperation({ summary: 'Delete a Post by ID' })
  @ApiResponse({ status: 204, description: 'Post deleted successfully.' })
  @ApiResponse({ status: 404, description: 'Post not found.' })
  @Delete(':id')
  async deletePost(@Param('id') id: number): Promise<void> {
    try {
      const deleted = await this.postService.deletePost(id);
      if (!deleted) {
        throw new HttpException('Post not found.', HttpStatus.NOT_FOUND);
      }
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to delete Post record.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @ApiOperation({ summary: 'Get all Posts' })
  @ApiResponse({ status: 200, description: 'Posts retrieved successfully.' })
  @Get()
  async getAllPosts(): Promise<BlogPost[]> {
    try {
      return await this.postService.getAllPosts();
    } catch (error) {
      throw new HttpException(
        'Failed to retrieve Posts.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
