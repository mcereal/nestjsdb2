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
    return await this.userRoleModel.find({});
  }

  async getUserRole(id: number): Promise<UserRoleView | null> {
    return await this.userRoleModel.findOne({ id });
  }

  async createUserRole(data: Partial<UserRoleView>): Promise<UserRoleView> {
    const userRole = this.userRoleModel.create(data);
    return await this.userRoleModel.save(userRole);
  }

  async updateUserRole(
    id: number,
    data: Partial<UserRoleView>,
  ): Promise<UserRoleView | null> {
    await this.userRoleModel.update({ id }, data);
    return await this.userRoleModel.findOne({ id });
  }

  async deleteUserRole(id: number): Promise<boolean> {
    await this.userRoleModel.delete({ id });
    const deletedUserRole = await this.userRoleModel.findOne({ id });
    return !deletedUserRole;
  }
}
