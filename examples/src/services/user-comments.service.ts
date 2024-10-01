// src/services/user-comments.service.ts

import { Inject, Injectable } from '@nestjs/common';
import { UserCommentsView } from '../entities/user-comments.view';
import { Model } from '@mcereal/nestjsdb2';

@Injectable()
export class UserCommentsService {
  constructor(
    @Inject('USERCOMMENTSVIEW_MODEL')
    private readonly userCommentsModel: Model<UserCommentsView>,
  ) {}

  async getUserComments(): Promise<UserCommentsView[]> {
    return await this.userCommentsModel.find({});
  }
}
