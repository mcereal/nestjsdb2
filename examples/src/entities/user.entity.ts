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
  @PrimaryKey({ type: 'integer', autoIncrement: true })
  id!: number;

  @Column({ type: 'varchar', length: 50, unique: true, nullable: false })
  username!: string;

  @Column({ type: 'varchar', length: 100, unique: true, nullable: false })
  email!: string;

  @Column({ type: 'varchar', length: 255, nullable: false })
  password!: string;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    nullable: false,
  })
  created_at!: Date;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    nullable: false,
  })
  updated_at!: Date;

  // Relations
  posts!: Post[];
  comments!: Comment[];
  roles!: UserRole[];
}
