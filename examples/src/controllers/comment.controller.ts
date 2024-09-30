// src/controllers/comment.controller.ts

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
import { CommentService } from '../services/comment.service';
import { Comment } from '../entities/comment.entity';

@ApiTags('Comments')
@Controller('comments')
export class CommentController {
  constructor(private readonly commentService: CommentService) {}

  @ApiOperation({ summary: 'Create a new Comment' })
  @ApiResponse({ status: 201, description: 'Comment created successfully.' })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  @Post()
  async createComment(@Body() data: Partial<Comment>): Promise<Comment> {
    try {
      return await this.commentService.createComment(data);
    } catch (error) {
      throw new HttpException(
        'Failed to create Comment record.',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @ApiOperation({ summary: 'Find a Comment by ID' })
  @ApiResponse({ status: 200, description: 'Comment found.' })
  @ApiResponse({ status: 404, description: 'Comment not found.' })
  @Get(':id')
  async findComment(@Param('id') id: number): Promise<Comment> {
    try {
      const comment = await this.commentService.findComment(id);
      if (!comment) {
        throw new HttpException('Comment not found.', HttpStatus.NOT_FOUND);
      }
      return comment;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to find Comment record.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @ApiOperation({ summary: 'Update a Comment by ID' })
  @ApiResponse({ status: 200, description: 'Comment updated successfully.' })
  @ApiResponse({ status: 404, description: 'Comment not found.' })
  @Put(':id')
  async updateComment(
    @Param('id') id: number,
    @Body() updatedData: Partial<Comment>,
  ): Promise<Comment> {
    try {
      const updatedComment = await this.commentService.updateComment(
        id,
        updatedData,
      );
      if (!updatedComment) {
        throw new HttpException('Comment not found.', HttpStatus.NOT_FOUND);
      }
      return updatedComment;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to update Comment record.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @ApiOperation({ summary: 'Delete a Comment by ID' })
  @ApiResponse({ status: 204, description: 'Comment deleted successfully.' })
  @ApiResponse({ status: 404, description: 'Comment not found.' })
  @Delete(':id')
  async deleteComment(@Param('id') id: number): Promise<void> {
    try {
      const deleted = await this.commentService.deleteComment(id);
      if (!deleted) {
        throw new HttpException('Comment not found.', HttpStatus.NOT_FOUND);
      }
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to delete Comment record.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @ApiOperation({ summary: 'Get all Comments' })
  @ApiResponse({ status: 200, description: 'Comments retrieved successfully.' })
  @Get()
  async getAllComments(): Promise<Comment[]> {
    try {
      return await this.commentService.getAllComments();
    } catch (error) {
      throw new HttpException(
        'Failed to retrieve Comments.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
