// src/type/unique-metadata.types.ts

export interface UniqueColumnMetadataOptions {
  /**
   * The name of the unique constraint. If not provided, a default name will be generated.
   */
  name?: string;

  /**
   * The columns that are unique. If not provided, the columns will not be unique.
   */
  columns: string[];
}
