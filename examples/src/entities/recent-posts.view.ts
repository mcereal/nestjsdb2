// src/entities/recent-posts.view.ts
import { Entity, View, Column } from '@mcereal/nestjsdb2';

@Entity({
  name: 'RecentPosts',
  entityType: 'view',
})
@View({
  schema: 'public',
  viewName: 'RecentPosts',
  query: `
    SELECT
        p.id AS post_id,
        p.title,
        p.created_at,
        u.username AS author
    FROM
        public.Posts p
    JOIN
        public.Users u ON p.user_id = u.id
    ORDER BY
        p.created_at DESC
    LIMIT 10
  `,
})
export class RecentPostsView {
  @Column({ type: 'integer', nullable: false })
  post_id!: number;

  @Column({ type: 'varchar', length: 150, nullable: false })
  title!: string;

  @Column({ type: 'timestamp', nullable: false })
  created_at!: Date;

  @Column({ type: 'varchar', length: 50, nullable: false })
  author!: string;
}
