// example/src/entities/post.entity.ts

import { Entity, Column, PrimaryKey, ForeignKey } from '@mcereal/nestjsdb2';
import { User } from './user.entity';
import { Comment } from './comment.entity';
import { Category } from './category.entity';

@Entity({
  name: 'Post',
  entityType: 'table',
})
export class Post {
  @PrimaryKey({ type: 'integer', autoIncrement: true })
  id!: number;

  @ForeignKey({ target: User, nullable: false })
  user_id!: number;

  @Column({ type: 'varchar', length: 150, nullable: false })
  title!: string;

  @Column({ type: 'text', nullable: false })
  content!: string;

  @Column({ type: 'boolean', default: false, nullable: false })
  published!: boolean;

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
  author!: User;
  comments!: Comment[];
  categories!: Category[];
}
