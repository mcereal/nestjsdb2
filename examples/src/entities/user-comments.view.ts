// src/emtities/user-comments.view.ts
import { Entity, View, Column, PrimaryKey } from '@mcereal/nestjsdb2';

@Entity({
  name: 'UserComments',
  entityType: 'view',
})
@View({
  schema: 'public',
  viewName: 'UserComments',
  query: `
    SELECT
        c.id AS comment_id,
        c.content,
        c.created_at,
        u.id AS user_id,
        u.username
    FROM
        public.Comments c
    JOIN
        public.Users u ON c.user_id = u.id
  `,
})
export class UserCommentsView {
  @PrimaryKey({ type: 'integer', name: 'comment_id', nullable: false })
  @Column({ type: 'integer', name: 'comment_id', nullable: false })
  comment_id!: number;

  @Column({ type: 'text', name: 'content', nullable: false })
  content!: string;

  @Column({ type: 'timestamp', name: 'created_at', nullable: false })
  created_at!: Date;

  @Column({ type: 'integer', name: 'user_id', nullable: false })
  user_id!: number;

  @Column({ type: 'varchar', name: 'username', length: 50, nullable: false })
  username!: string;
}
