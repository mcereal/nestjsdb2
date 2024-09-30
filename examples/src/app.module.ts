// testconnection/app.module.ts

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import config from './config';
import { User } from './entities/user.entity';
import { Post as BlogPost } from './entities/post.entity';
import { Comment } from './entities/comment.entity';
import { Category } from './entities/category.entity';
import { UserRoleView } from './entities/user-role.view';
import { UserPostCountView } from './entities/user-post-count.view';
import { RecentPostsView } from './entities/recent-posts.view';
import { UserCommentsView } from './entities/user-comments.view';

import { Db2Module, IDb2ConfigOptions } from '@mcereal/nestjsdb2';

import { UserController } from './controllers/user.controller';
import { PostController } from './controllers/post.controller';
import { CommentController } from './controllers/comment.controller';
import { CategoryController } from './controllers/category.controller';
import { UserRoleController } from './controllers/user-role.controller';
import { UserPostCountController } from './controllers/user-post-count.controller';
import { RecentPostsController } from './controllers/recent-posts.controller';
import { UserCommentsController } from './controllers/user-comments.controller';

import { UserService } from './services/user.service';
import { PostService } from './services/post.service';
import { CategoryService } from './services/category.service';
import { UserRoleService } from './services/user-role.service';
import { UserPostCountService } from './services/user-post-count.service';
import { RecentPostsService } from './services/recent-posts.service';
import { UserCommentsService } from './services/user-comments.service';
import { db2ValidationSchema } from './config/db2.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [config],
      validationSchema: db2ValidationSchema, // Apply validation schema
    }),
    // Initialize Db2Module asynchronously
    Db2Module.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (
        configService: ConfigService,
      ): Promise<IDb2ConfigOptions> => {
        return configService.get<IDb2ConfigOptions>('db2');
      },
      inject: [ConfigService],
    }),
    // Register entities and views with Db2Module
    Db2Module.forFeature([
      User,
      BlogPost,
      Comment,
      Category,
      UserRoleView,
      UserPostCountView,
      RecentPostsView,
      UserCommentsView,
    ]),
  ],
  controllers: [
    UserController,
    PostController,
    CommentController,
    CategoryController,
    UserRoleController,
    UserPostCountController,
    RecentPostsController,
    UserCommentsController,
  ],
  providers: [
    UserService,
    PostService,
    CategoryService,
    UserRoleService,
    UserPostCountService,
    RecentPostsService,
    UserCommentsService,
    // Model Providers
    {
      provide: 'USER_MODEL',
      useFactory: (db2Module: Db2Module) =>
        db2Module.getModel<User>('UserModel'),
      inject: ['DB2_MODULE'],
    },
    {
      provide: 'POST_MODEL',
      useFactory: (db2Module: Db2Module) =>
        db2Module.getModel<BlogPost>('PostModel'),
      inject: ['DB2_MODULE'],
    },
    {
      provide: 'COMMENT_MODEL',
      useFactory: (db2Module: Db2Module) =>
        db2Module.getModel<Comment>('CommentModel'),
      inject: ['DB2_MODULE'],
    },
    {
      provide: 'CATEGORY_MODEL',
      useFactory: (db2Module: Db2Module) =>
        db2Module.getModel<Category>('CategoryModel'),
      inject: ['DB2_MODULE'],
    },
    {
      provide: 'USERROLE_MODEL',
      useFactory: (db2Module: Db2Module) =>
        db2Module.getModel<UserRoleView>('UserRoleModel'),
      inject: ['DB2_MODULE'],
    },
    {
      provide: 'USERPOSTCOUNTVIEW_MODEL',
      useFactory: (db2Module: Db2Module) =>
        db2Module.getModel<UserPostCountView>('UserPostCountViewModel'),
      inject: ['DB2_MODULE'],
    },
    {
      provide: 'RECENTPOSTSVIEW_MODEL',
      useFactory: (db2Module: Db2Module) =>
        db2Module.getModel<RecentPostsView>('RecentPostsViewModel'),
      inject: ['DB2_MODULE'],
    },
    {
      provide: 'USERCOMMENTSVIEW_MODEL',
      useFactory: (db2Module: Db2Module) =>
        db2Module.getModel<UserCommentsView>('UserCommentsViewModel'),
      inject: ['DB2_MODULE'],
    },
  ],
})
export class AppModule {}
