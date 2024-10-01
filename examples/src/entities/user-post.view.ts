// src/entities/user-post.view.ts
import { Entity, View, Column, PrimaryKey } from '@mcereal/nestjsdb2';

@Entity({
  name: 'UserPost',
  entityType: 'view',
})
@View({
  schema: 'public',
  viewName: 'UserPost',
  query: `
    SELECT
        p.id AS post_id,
        p.title,
        p.content,
        p.created_at,
        u.id AS user_id,
        u.username
    FROM
        public.Posts p
    JOIN
        public.Users u ON p.user_id = u.id
  `,
})
export class UserPostView {
  @PrimaryKey({ type: 'integer', name: 'post_id', nullable: false })
  @Column({ type: 'integer', name: 'post_id', nullable: false })
  post_id!: number;

  @Column({ type: 'varchar', name: 'title', length: 150, nullable: false })
  title!: string;

  @Column({ type: 'text', name: 'content', nullable: false })
  content!: string;

  @Column({ type: 'timestamp', name: 'created_at', nullable: false })
  created_at!: Date;

  @Column({ type: 'integer', name: 'user_id', nullable: false })
  user_id!: number;

  @Column({ type: 'varchar', name: 'username', length: 50, nullable: false })
  username!: string;
}
