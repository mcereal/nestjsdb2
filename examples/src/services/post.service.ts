// testconnection/post.service.ts

import {
  Injectable,
  Logger,
  Inject,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Post as BlogPost } from '../entities/post.entity';
import { Model } from '@mcereal/nestjsdb2';

@Injectable()
export class PostService {
  private readonly logger = new Logger(PostService.name);

  constructor(
    @Inject('POST_MODEL') private readonly postModel: Model<BlogPost>,
  ) {}

  async createPost(data: Partial<BlogPost>): Promise<BlogPost> {
    try {
      const post = this.postModel.create(data);
      return await this.postModel.save(post);
    } catch (error) {
      this.logger.error('Error creating post:', error);
      throw new HttpException(
        'Failed to create Post record.',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async findPost(id: number): Promise<BlogPost | null> {
    try {
      const post = await this.postModel.findOne({ id });
      if (!post) {
        throw new HttpException('Post not found.', HttpStatus.NOT_FOUND);
      }
      return post;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error('Error finding post:', error);
      throw new HttpException(
        'Failed to find Post record.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async updatePost(
    id: number,
    data: Partial<BlogPost>,
  ): Promise<BlogPost | null> {
    try {
      await this.postModel.update({ id }, data);
      const updatedPost = await this.postModel.findOne({ id });
      if (!updatedPost) {
        throw new HttpException('Post not found.', HttpStatus.NOT_FOUND);
      }
      return updatedPost;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error('Error updating post:', error);
      throw new HttpException(
        'Failed to update Post record.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async deletePost(id: number): Promise<boolean> {
    try {
      const deleted = await this.postModel.delete({ id });
      if (!deleted) {
        throw new HttpException('Post not found.', HttpStatus.NOT_FOUND);
      }
      return true;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error('Error deleting post:', error);
      throw new HttpException(
        'Failed to delete Post record.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getAllPosts(): Promise<BlogPost[]> {
    try {
      return await this.postModel.find({});
    } catch (error) {
      this.logger.error('Error retrieving all posts:', error);
      throw new HttpException(
        'Failed to retrieve Posts.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
