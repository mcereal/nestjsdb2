// src/services/user-role.service.ts
import { Inject, Injectable } from '@nestjs/common';
import { UserRoleView } from '../entities/user-role.view';
import { Model } from '@mcereal/nestjsdb2';

@Injectable()
export class UserRoleService {
  constructor(
    @Inject('USER_ROLE_VIEW')
    private readonly userRoleModel: Model<UserRoleView>,
  ) {}

  async getUserRoles(): Promise<UserRoleView[]> {
    return await this.userRoleModel.find();
  }

  async getUserRole(userId: number): Promise<UserRoleView | null> {
    return await this.userRoleModel.findOne({ userId });
  }

  async createUserRole(data: Partial<UserRoleView>): Promise<UserRoleView> {
    const userRole = this.userRoleModel.create(data);
    return await this.userRoleModel.save(userRole);
  }

  async updateUserRole(
    userId: number,
    data: Partial<UserRoleView>,
  ): Promise<UserRoleView | null> {
    await this.userRoleModel.update({ userId }, data);
    return await this.userRoleModel.findOne({ userId });
  }

  async deleteUserRole(userId: number): Promise<boolean> {
    const result = await this.userRoleModel.delete({ userId });
    return result.affected > 0;
  }
}
