// src/entities/user-role.view.ts
import { Entity, Column, PrimaryKey } from '@mcereal/nestjsdb2';
import { User } from './user.entity';

@Entity({
  name: 'UserRole',
  entityType: 'view',
})
export class UserRoleView {
  @PrimaryKey({
    type: 'integer',
    name: 'id',
    autoIncrement: true,
    nullable: false,
  })
  id!: number;

  @Column({
    type: 'varchar',
    name: 'role_name',
    length: 50,
    unique: true,
    nullable: false,
  })
  role_name!: string;

  @Column({ type: 'varchar', name: 'description', length: 255, nullable: true })
  description?: string;

  // Relations
  users!: User[];
}
