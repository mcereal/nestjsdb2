// src/service/recent-posts.service.ts
import { Inject, Injectable } from '@nestjs/common';
import { RecentPostsView } from '../entities/recent-posts.view';
import { Model } from '@mcereal/nestjsdb2';

@Injectable()
export class RecentPostsService {
  constructor(
    @Inject('RECENT_POSTS_VIEW')
    private readonly recentPostsModel: Model<RecentPostsView>,
  ) {}

  async getRecentPosts(): Promise<RecentPostsView[]> {
    return await this.recentPostsModel.find();
  }
}
