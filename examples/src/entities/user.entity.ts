// examples/src/entities/user.entity.ts

import { Entity, Column, PrimaryKey } from '@mcereal/nestjsdb2';
import { Post } from './post.entity';
import { Comment } from './comment.entity';
import { UserRole } from './user-role.entity';

@Entity({
  name: 'User',
  entityType: 'view',
})
export class User {
  @PrimaryKey({
    type: 'integer',
    name: 'id',
    autoIncrement: true,
    nullable: false,
  })
  id!: number;

  @Column({
    type: 'varchar',
    name: 'username',
    length: 50,
    unique: true,
    nullable: false,
  })
  username!: string;

  @Column({
    type: 'varchar',
    name: 'email',
    length: 100,
    unique: true,
    nullable: false,
  })
  email!: string;

  @Column({ type: 'varchar', name: 'password', length: 255, nullable: false })
  password!: string;

  @Column({
    type: 'timestamp',
    name: 'created_at',
    default: () => 'CURRENT_TIMESTAMP',
    nullable: false,
  })
  created_at!: Date;

  @Column({
    type: 'timestamp',
    name: 'updated_at',
    default: () => 'CURRENT_TIMESTAMP',
    nullable: false,
  })
  updated_at!: Date;

  // Relations
  posts!: Post[];
  comments!: Comment[];
  roles!: UserRole[];
}
