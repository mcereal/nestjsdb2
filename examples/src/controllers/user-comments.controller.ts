// src/controllers/user-comments.controller.ts

import { Controller, Get, HttpException, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UserCommentsService } from '../services/user-comments.service';
import { UserCommentsView } from '../entities/user-comments.view';

@ApiTags('UserComments')
@Controller('views/usercomments')
export class UserCommentsController {
  constructor(private readonly userCommentsService: UserCommentsService) {}

  @ApiOperation({ summary: 'Get User Comments' })
  @ApiResponse({
    status: 200,
    description: 'User comments retrieved successfully.',
  })
  @ApiResponse({ status: 500, description: 'Internal Server Error.' })
  @Get()
  async getUserComments(): Promise<UserCommentsView[]> {
    try {
      return await this.userCommentsService.getUserComments();
    } catch (error) {
      throw new HttpException(
        'Failed to retrieve User Comments.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
