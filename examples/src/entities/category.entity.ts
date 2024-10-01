// examples/src/entities/category.entity.ts

import { Entity, Column, PrimaryKey } from '@mcereal/nestjsdb2';
import { Post } from './post.entity';

@Entity({
  name: 'Category',
  entityType: 'table',
})
export class Category {
  @PrimaryKey({
    type: 'integer',
    name: 'id',
    autoIncrement: true,
    nullable: false,
  })
  id!: number;

  @Column({
    type: 'varchar',
    name: 'name',
    length: 50,
    unique: true,
    nullable: false,
  })
  name!: string;

  @Column({ type: 'varchar', name: 'description', length: 255, nullable: true })
  description?: string;

  @Column({
    type: 'timestamp',
    name: 'created_at',
    default: () => 'CURRENT_TIMESTAMP',
    nullable: false,
  })
  created_at!: Date;

  // Relations
  posts!: Post[];
}
