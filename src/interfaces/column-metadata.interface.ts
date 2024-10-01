// interfaces/column-metadata.interface.ts
export interface ColumnMetadata {
  name: string; // Column name
  dataType: string; // Data type (e.g., INTEGER, VARCHAR)
  length: number; // Length of the data type
  nullable: boolean; // Indicates if the column can contain NULL values
  typeId: number; // Type ID for the data type
  scale: number; // Scale of the data type
}
