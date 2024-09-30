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
  @PrimaryKey({
    type: 'integer',
    name: 'id',
    autoIncrement: true,
    nullable: false,
  })
  id!: number;

  @ForeignKey({
    target: User,
    name: 'user_id',
    reference: 'users(id)', // Added 'reference' property
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  user_id!: number;

  @Column({
    type: 'varchar',
    name: 'title',
    length: 150,
    nullable: false,
    unique: true,
  })
  title!: string;

  @Column({ type: 'text', name: 'content', nullable: false })
  content!: string;

  @Column({
    type: 'boolean',
    name: 'published',
    default: false,
    nullable: false,
  })
  published!: boolean;

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
  author!: User;
  comments!: Comment[];
  categories!: Category[];
}
