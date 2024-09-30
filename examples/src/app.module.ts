// src/app.module.ts

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import config from './config';
import { User } from './entities/user.entity';
import { Post } from './entities/post.entity';
import { Comment } from './entities/comment.entity';
import { Category } from './entities/category.entity';
import { UserRoleView } from './entities/user-role.view';
import { UserPostCountView } from './entities/user-post-count.view';
import { RecentPostsView } from './entities/recent-posts.view';
import { UserCommentsView } from './entities/user-comments.view';

import { Db2NestModule } from './db2-nest.module';
import appSchema from './schemas/public.schema'; // Import your schema

import { PostController } from './controllers/post.controller';
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
import {
  IDb2ConfigOptions,
  Db2Module as UnderlyingDb2Module,
} from '@mcereal/nestjsdb2';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [config],
      validationSchema: db2ValidationSchema,
    }),
    // Initialize Db2NestModule asynchronously with proper DI
    Db2NestModule.forRootAsync({
      imports: [ConfigModule], // Import ConfigModule for the factory
      useFactory: async (configService: ConfigService) => {
        const db2Config = configService.get<IDb2ConfigOptions>('db2');
        if (!db2Config) {
          throw new Error('DB2 configuration not found');
        }
        return db2Config;
      },
      inject: [ConfigService], // Inject ConfigService into the factory
    }),
    // Register entities and views with Db2NestModule using the schema
    Db2NestModule.forFeature(appSchema),
  ],
  controllers: [
    PostController,
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
      useFactory: (db2Module: UnderlyingDb2Module) =>
        db2Module.getModel<User>('UserModel'),
      inject: ['DB2_MODULE'],
    },
    {
      provide: 'POST_MODEL',
      useFactory: (db2Module: UnderlyingDb2Module) =>
        db2Module.getModel<Post>('PostModel'),
      inject: ['DB2_MODULE'],
    },
    {
      provide: 'COMMENT_MODEL',
      useFactory: (db2Module: UnderlyingDb2Module) =>
        db2Module.getModel<Comment>('CommentModel'),
      inject: ['DB2_MODULE'],
    },
    {
      provide: 'CATEGORY_MODEL',
      useFactory: (db2Module: UnderlyingDb2Module) =>
        db2Module.getModel<Category>('CategoryModel'),
      inject: ['DB2_MODULE'],
    },
    {
      provide: 'USERROLE_MODEL',
      useFactory: (db2Module: UnderlyingDb2Module) =>
        db2Module.getModel<UserRoleView>('UserRoleModel'),
      inject: ['DB2_MODULE'],
    },
    {
      provide: 'USERPOSTCOUNTVIEW_MODEL',
      useFactory: (db2Module: UnderlyingDb2Module) =>
        db2Module.getModel<UserPostCountView>('UserPostCountViewModel'),
      inject: ['DB2_MODULE'],
    },
    {
      provide: 'RECENTPOSTSVIEW_MODEL',
      useFactory: (db2Module: UnderlyingDb2Module) =>
        db2Module.getModel<RecentPostsView>('RecentPostsViewModel'),
      inject: ['DB2_MODULE'],
    },
    {
      provide: 'USERCOMMENTSVIEW_MODEL',
      useFactory: (db2Module: UnderlyingDb2Module) =>
        db2Module.getModel<UserCommentsView>('UserCommentsViewModel'),
      inject: ['DB2_MODULE'],
    },
  ],
})
export class AppModule {}
