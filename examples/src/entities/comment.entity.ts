// examples/src/entities/comment.entity.ts

import { Entity, Column, PrimaryKey, ForeignKey } from '@mcereal/nestjsdb2';
import { User } from './user.entity';
import { Post as BlogPost } from './post.entity';

@Entity({
  name: 'Comment',
  entityType: 'table',
})
export class Comment {
  @PrimaryKey({ type: 'integer', autoIncrement: true })
  id!: number;

  @ForeignKey({ target: BlogPost, nullable: false })
  post_id!: number;

  @ForeignKey({ target: User, nullable: false })
  user_id!: number;

  @Column({ type: 'text', nullable: false })
  content!: string;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    nullable: false,
  })
  created_at!: Date;

  // Relations
  post!: BlogPost;
  commenter!: User;
}
