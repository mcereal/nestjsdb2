// examples/src/entities/user-post-count.view.ts

import { Entity, View, Column, PrimaryKey } from '@mcereal/nestjsdb2';

@Entity({
  name: 'UserPostCount',
  entityType: 'view',
})
@View({
  schema: 'public',
  viewName: 'UserPostCount',
  query: `
    SELECT
        u.id AS user_id,
        u.username,
        COUNT(p.id) AS post_count
    FROM
        public.Users u
    LEFT JOIN
        public.Posts p ON u.id = p.user_id
    GROUP BY
        u.id, u.username
  `,
})
export class UserPostCountView {
  @PrimaryKey({ type: 'integer', name: 'user_id', nullable: false })
  @Column({ type: 'integer', name: 'user_id', nullable: false })
  user_id!: number;

  @Column({ type: 'varchar', name: 'username', length: 50, nullable: false })
  username!: string;

  @Column({ type: 'integer', name: 'post_count', nullable: false })
  post_count!: number;
}
