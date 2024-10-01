// src/entities/recent-posts.view.ts
import { Entity, View, Column, PrimaryKey } from '@mcereal/nestjsdb2';

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
  @PrimaryKey({ type: 'integer', name: 'post_id', length: 50, nullable: false })
  @Column({ type: 'integer', name: 'post_id', length: 50, nullable: false })
  post_id!: number;

  @Column({ type: 'varchar', name: 'title', length: 150, nullable: false })
  title!: string;

  @Column({
    type: 'timestamp',
    name: 'created_at',
    length: 150,
    nullable: false,
  })
  created_at!: Date;

  @Column({ type: 'varchar', name: 'author', length: 50, nullable: false })
  author!: string;
}
