import { ApiProperty } from '@nestjs/swagger';

export class ProductImage {
  @ApiProperty({ format: 'uri', example: 'https://cdn.example.com/img.jpg' })
  url!: string;

  @ApiProperty({ required: false })
  alt?: string;

  @ApiProperty({ default: false })
  isPrimary!: boolean;
}

export class ProductInventory {
  @ApiProperty({ minimum: 0, example: 50 })
  quantity!: number;

  @ApiProperty({ required: false, example: 'KB-BLK-US' })
  sku?: string;

  @ApiProperty({ default: true })
  trackInventory!: boolean;
}

export class Product {
  @ApiProperty({ example: 'prod_1' })
  id!: string;

  @ApiProperty({ example: 'Ergonomic Keyboard' })
  name!: string;

  @ApiProperty({ required: false })
  description?: string;

  @ApiProperty({ minimum: 0, example: 129.99 })
  price!: number;

  @ApiProperty({ minLength: 3, maxLength: 3, example: 'USD' })
  currency!: string;

  @ApiProperty({ required: false })
  category?: string;

  @ApiProperty({ type: [String] })
  tags!: string[];

  @ApiProperty({ type: () => [ProductImage] })
  images!: ProductImage[];

  @ApiProperty({ type: () => ProductInventory })
  inventory!: ProductInventory;

  @ApiProperty()
  inStock!: boolean;

  @ApiProperty({ minimum: 0, maximum: 5, required: false })
  rating?: number;
}

export class ProductVariant {
  @ApiProperty({ example: 'var_1' })
  id!: string;

  @ApiProperty({ example: 'KB-BLK-US-L' })
  sku!: string;

  @ApiProperty({ type: 'object', additionalProperties: { type: 'string' }, example: { size: 'L', color: 'blue' } })
  attributes!: Record<string, string>;

  @ApiProperty({ required: false })
  price?: number;

  @ApiProperty({ minimum: 0, default: 0 })
  quantity!: number;
}

export class CreateProductBody {
  @ApiProperty({ example: 'Ergonomic Keyboard' })
  name!: string;

  @ApiProperty({ required: false })
  description?: string;

  @ApiProperty({ minimum: 0, example: 129.99 })
  price!: number;

  @ApiProperty({ minLength: 3, maxLength: 3, example: 'USD' })
  currency!: string;

  @ApiProperty({ required: false })
  category?: string;

  @ApiProperty({ type: [String], required: false })
  tags?: string[];

  @ApiProperty({ type: () => [ProductImage], required: false })
  images?: ProductImage[];

  @ApiProperty({ type: () => ProductInventory, required: false })
  inventory?: ProductInventory;
}

export class UpdateProductBody {
  @ApiProperty({ required: false })
  name?: string;

  @ApiProperty({ required: false })
  description?: string;

  @ApiProperty({ minimum: 0, required: false })
  price?: number;

  @ApiProperty({ type: [String], required: false })
  tags?: string[];

  @ApiProperty({ required: false })
  isPublished?: boolean;
}
