// src/entities/user-post.view.ts
import { Entity, View, Column } from '@mcereal/nestjsdb2';

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
  @Column({ type: 'integer', nullable: false })
  post_id!: number;

  @Column({ type: 'varchar', length: 150, nullable: false })
  title!: string;

  @Column({ type: 'text', nullable: false })
  content!: string;

  @Column({ type: 'timestamp', nullable: false })
  created_at!: Date;

  @Column({ type: 'integer', nullable: false })
  user_id!: number;

  @Column({ type: 'varchar', length: 50, nullable: false })
  username!: string;
}
