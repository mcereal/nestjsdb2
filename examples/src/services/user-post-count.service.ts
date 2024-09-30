// src/services/user-post-count.service.ts
import { Inject, Injectable } from '@nestjs/common';
import { UserPostCountView } from '../entities/user-post-count.view';
import { Model } from '@mcereal/nestjsdb2';

@Injectable()
export class UserPostCountService {
  constructor(
    @Inject('USER_POST_COUNT_VIEW')
    private readonly userPostCountModel: Model<UserPostCountView>,
  ) {}

  async getUserPostCounts(): Promise<UserPostCountView[]> {
    return await this.userPostCountModel.find({});
  }
}
