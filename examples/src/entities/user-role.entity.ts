// examples/src/entities/user-role.entity.ts

import { Entity, Column, PrimaryKey } from '@mcereal/nestjsdb2';
import { User } from './user.entity';

@Entity({
  name: 'UserRole',
  entityType: 'table',
})
export class UserRole {
  @PrimaryKey({ type: 'integer', autoIncrement: true })
  id!: number;

  @Column({ type: 'varchar', length: 50, unique: true, nullable: false })
  role_name!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description?: string;

  // Relations
  users!: User[];
}
