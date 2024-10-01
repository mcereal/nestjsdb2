// src/services/user-post.service.ts
import { Inject, Injectable } from '@nestjs/common';
import { UserPostView } from '../entities/user-post.view';
import { Model } from '@mcereal/nestjsdb2';

@Injectable()
export class UserPostService {
  constructor(
    @Inject('USER_POST_VIEW')
    private readonly userPostModel: Model<UserPostView>,
  ) {}

  async getUserPosts(): Promise<UserPostView[]> {
    return await this.userPostModel.find({});
  }
}
