// testconnection/controllers/user-post-count.controller.ts

import { Controller, Get, HttpException, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UserPostCountService } from '../services/user-post-count.service';
import { UserPostCountView } from '../entities/user-post-count.view';

@ApiTags('UserPostCount')
@Controller('views/userpostcount')
export class UserPostCountController {
  constructor(private readonly userPostCountService: UserPostCountService) {}

  @ApiOperation({ summary: 'Get User Post Counts' })
  @ApiResponse({
    status: 200,
    description: 'User post counts retrieved successfully.',
  })
  @ApiResponse({ status: 500, description: 'Internal Server Error.' })
  @Get()
  async getUserPostCounts(): Promise<UserPostCountView[]> {
    try {
      return await this.userPostCountService.getUserPostCounts();
    } catch (error) {
      throw new HttpException(
        'Failed to retrieve User Post Counts.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
