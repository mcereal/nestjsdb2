// examples/src/entities/comment.entity.ts

import { Entity, Column, PrimaryKey, ForeignKey } from '@mcereal/nestjsdb2';
import { User } from './user.entity';
import { Post as BlogPost } from './post.entity';

@Entity({
  name: 'Comment',
  entityType: 'table',
})
export class Comment {
  @PrimaryKey({
    type: 'integer',
    name: 'id',
    autoIncrement: true,
    nullable: false,
  })
  id!: number;

  @ForeignKey({
    target: BlogPost,
    name: 'post_id',
    referencedTable: 'posts',
    referencedColumnNames: ['id'],
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  post_id!: number;

  @ForeignKey({
    target: User,
    name: 'user_id',
    referencedTable: 'users',
    referencedColumnNames: ['id'],
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  user_id!: number;

  @Column({ type: 'text', name: 'content', nullable: false })
  content!: string;

  @Column({
    type: 'timestamp',
    name: 'created_at',
    default: () => 'CURRENT_TIMESTAMP',
    nullable: false,
  })
  created_at!: Date;

  // Relations
  post!: BlogPost;
  commenter!: User;
}
