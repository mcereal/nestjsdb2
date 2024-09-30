// src/schemas/app.schema.ts

import { Schema } from '@mcereal/nestjsdb2';
import { Post } from '../entities/post.entity';
import { Comment } from '../entities/comment.entity';
import { Category } from '../entities/category.entity';
import { UserRoleView } from '../entities/user-role.view';
import { UserPostCountView } from '../entities/user-post-count.view';
import { RecentPostsView } from '../entities/recent-posts.view';
import { UserCommentsView } from '../entities/user-comments.view';

const publicSchema = new Schema([
  Post,
  Comment,
  Category,
  UserRoleView,
  UserPostCountView,
  RecentPostsView,
  UserCommentsView,
]);

publicSchema.finalizeSchema();

export default publicSchema;
