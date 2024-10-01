// src/controllers/user-role.controller.ts

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UserRoleService } from '../services/user-role.service';
import { UserRoleView } from '../entities/user-role.view';

@ApiTags('UserRoles')
@Controller('userroles')
export class UserRoleController {
  constructor(private readonly userRoleService: UserRoleService) {}

  @ApiOperation({ summary: 'Create a new UserRole' })
  @ApiResponse({ status: 201, description: 'UserRole created successfully.' })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  @Post()
  async createUserRole(
    @Body() data: Partial<UserRoleView>,
  ): Promise<UserRoleView> {
    try {
      return await this.userRoleService.createUserRole(data);
    } catch (error) {
      throw new HttpException(
        'Failed to create UserRole record.',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @ApiOperation({ summary: 'Find a UserRole by ID' })
  @ApiResponse({ status: 200, description: 'UserRole found.' })
  @ApiResponse({ status: 404, description: 'UserRole not found.' })
  @Get(':id')
  async findUserRole(@Param('id') id: number): Promise<UserRoleView> {
    try {
      const userRole = await this.userRoleService.getUserRole(id);
      if (!userRole) {
        throw new HttpException('UserRole not found.', HttpStatus.NOT_FOUND);
      }
      return userRole;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to find UserRole record.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @ApiOperation({ summary: 'Update a UserRole by ID' })
  @ApiResponse({ status: 200, description: 'UserRole updated successfully.' })
  @ApiResponse({ status: 404, description: 'UserRole not found.' })
  @Put(':id')
  async updateUserRole(
    @Param('id') id: number,
    @Body() updatedData: Partial<UserRoleView>,
  ): Promise<UserRoleView> {
    try {
      const updatedUserRole = await this.userRoleService.updateUserRole(
        id,
        updatedData,
      );
      if (!updatedUserRole) {
        throw new HttpException('UserRole not found.', HttpStatus.NOT_FOUND);
      }
      return updatedUserRole;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to update UserRole record.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @ApiOperation({ summary: 'Delete a UserRole by ID' })
  @ApiResponse({ status: 204, description: 'UserRole deleted successfully.' })
  @ApiResponse({ status: 404, description: 'UserRole not found.' })
  @Delete(':id')
  async deleteUserRole(@Param('id') id: number): Promise<void> {
    try {
      const deleted = await this.userRoleService.deleteUserRole(id);
      if (!deleted) {
        throw new HttpException('UserRole not found.', HttpStatus.NOT_FOUND);
      }
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to delete UserRole record.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @ApiOperation({ summary: 'Get all UserRoles' })
  @ApiResponse({
    status: 200,
    description: 'UserRoles retrieved successfully.',
  })
  @Get()
  async getAllUserRoles(): Promise<UserRoleView[]> {
    try {
      return await this.userRoleService.getUserRoles();
    } catch (error) {
      throw new HttpException(
        'Failed to retrieve UserRoles.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
