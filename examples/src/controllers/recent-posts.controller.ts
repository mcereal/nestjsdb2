// src/controllers/recent-posts.controller.ts

import { Controller, Get, HttpException, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RecentPostsService } from '../services/recent-posts.service';
import { RecentPostsView } from '../entities/recent-posts.view';

@ApiTags('RecentPosts')
@Controller('views/recentposts')
export class RecentPostsController {
  constructor(private readonly recentPostsService: RecentPostsService) {}

  @ApiOperation({ summary: 'Get Recent Posts' })
  @ApiResponse({
    status: 200,
    description: 'Recent posts retrieved successfully.',
  })
  @ApiResponse({ status: 500, description: 'Internal Server Error.' })
  @Get()
  async getRecentPosts(): Promise<RecentPostsView[]> {
    try {
      return await this.recentPostsService.getRecentPosts();
    } catch (error) {
      throw new HttpException(
        'Failed to retrieve Recent Posts.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
