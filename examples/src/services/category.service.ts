// src/service/category.service.ts

import { Injectable } from '@nestjs/common';
import { Category } from '../entities/category.entity';
import { Model } from '@mcereal/nestjsdb2';

@Injectable()
export class CategoryService {
  constructor(private readonly categoryModel: Model<Category>) {}

  async createCategory(data: Partial<Category>): Promise<Category> {
    const category = this.categoryModel.create(data);
    return await this.categoryModel.save(category);
  }

  async findCategory(id: number): Promise<Category | null> {
    return await this.categoryModel.findOne({ id });
  }

  async updateCategory(
    id: number,
    data: Partial<Category>,
  ): Promise<Category | null> {
    await this.categoryModel.update({ id }, data);
    return await this.categoryModel.findOne({ id });
  }

  async deleteCategory(id: number): Promise<Category | null> {
    const category = await this.categoryModel.findOne({ id });
    if (!category) {
      return null;
    }
    await this.categoryModel.delete({ id });
    return category;
  }

  getAllCategories(): Promise<Category[]> {
    return this.categoryModel.find();
  }
}
