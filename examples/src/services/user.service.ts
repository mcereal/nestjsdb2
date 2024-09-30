// testconnection/user.service.ts

import {
  Injectable,
  Logger,
  Inject,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { User } from '../entities/user.entity';
import { Model } from '@mcereal/nestjsdb2';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(@Inject('USER_MODEL') private readonly userModel: Model<User>) {}

  async createUser(data: Partial<User>): Promise<User> {
    try {
      const user = this.userModel.create(data);
      return await this.userModel.save(user);
    } catch (error) {
      this.logger.error('Error creating user:', error);
      throw new HttpException(
        'Failed to create User record.',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async findUser(id: number): Promise<User | null> {
    try {
      const user = await this.userModel.findOne({ id });
      if (!user) {
        throw new HttpException('User not found.', HttpStatus.NOT_FOUND);
      }
      return user;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error('Error finding user:', error);
      throw new HttpException(
        'Failed to find User record.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async updateUser(id: number, data: Partial<User>): Promise<User | null> {
    try {
      await this.userModel.update({ id }, data);
      const updatedUser = await this.userModel.findOne({ id });
      if (!updatedUser) {
        throw new HttpException('User not found.', HttpStatus.NOT_FOUND);
      }
      return updatedUser;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error('Error updating user:', error);
      throw new HttpException(
        'Failed to update User record.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async deleteUser(id: number): Promise<void> {
    try {
      const deleted = await this.userModel.delete({ id });
      if (!deleted) {
        throw new HttpException('User not found.', HttpStatus.NOT_FOUND);
      }
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error('Error deleting user:', error);
      throw new HttpException(
        'Failed to delete User record.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getAllUsers(): Promise<User[]> {
    try {
      return await this.userModel.find({});
    } catch (error) {
      this.logger.error('Error retrieving all users:', error);
      throw new HttpException(
        'Failed to retrieve Users.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getPaginatedUsers(
    page: number,
    pageSize: number,
  ): Promise<{ data: User[]; total: number; page: number; pageSize: number }> {
    try {
      const { data, total } = await this.userModel.findPaginated(
        {},
        page,
        pageSize,
      );
      return { data, total, page, pageSize };
    } catch (error) {
      this.logger.error('Error retrieving paginated users:', error);
      throw new HttpException(
        'Failed to retrieve paginated Users.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
