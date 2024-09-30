// testconnection/controllers/user.controller.ts

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  NotFoundException,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UserService } from '../services/user.service';
import { User } from '../entities/user.entity';

@ApiTags('Users')
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @ApiOperation({ summary: 'Create a new User' })
  @ApiResponse({ status: 201, description: 'User created successfully.' })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  @Post()
  async createUser(@Body() data: Partial<User>): Promise<User> {
    return this.userService.createUser(data);
  }

  @ApiOperation({ summary: 'Find a User by ID' })
  @ApiResponse({ status: 200, description: 'User found.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  @Get(':id')
  async findUser(@Param('id') id: number): Promise<User> {
    const user = await this.userService.findUser(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  @ApiOperation({ summary: 'Update a User by ID' })
  @ApiResponse({ status: 200, description: 'User updated successfully.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  @Put(':id')
  async updateUser(
    @Param('id') id: number,
    @Body() updatedData: Partial<User>,
  ): Promise<User> {
    const updatedUser = await this.userService.updateUser(id, updatedData);
    if (!updatedUser) {
      throw new NotFoundException('User not found');
    }
    return updatedUser;
  }

  @ApiOperation({ summary: 'Delete a User by ID' })
  @ApiResponse({ status: 204, description: 'User deleted successfully.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  @Delete(':id')
  async deleteUser(@Param('id') id: number): Promise<void> {
    return this.userService.deleteUser(id);
  }

  @ApiOperation({ summary: 'Get all Users' })
  @ApiResponse({ status: 200, description: 'Users retrieved successfully.' })
  @Get()
  async getAllUsers(): Promise<User[]> {
    return this.userService.getAllUsers();
  }

  @ApiOperation({ summary: 'Get paginated Users' })
  @ApiResponse({ status: 200, description: 'Users retrieved successfully.' })
  @Get('paginated')
  async getPaginatedUsers(
    @Query('page') page: number = 1,
    @Query('pageSize') pageSize: number = 10,
  ): Promise<{ data: User[]; total: number; page: number; pageSize: number }> {
    return this.userService.getPaginatedUsers(page, pageSize);
  }
}
