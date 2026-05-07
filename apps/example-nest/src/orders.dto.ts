import { ApiProperty } from '@nestjs/swagger';

export class Address {
  @ApiProperty()
  line1!: string;

  @ApiProperty({ required: false })
  line2?: string;

  @ApiProperty()
  city!: string;

  @ApiProperty({ required: false })
  state?: string;

  @ApiProperty({ minLength: 2, maxLength: 2, example: 'US' })
  country!: string;

  @ApiProperty()
  postalCode!: string;
}

export class OrderLineItem {
  @ApiProperty({ example: 'prod_1' })
  productId!: string;

  @ApiProperty({ required: false })
  variantId?: string;

  @ApiProperty({ minimum: 1 })
  quantity!: number;

  @ApiProperty({ required: false })
  unitPrice?: number;
}

export class Order {
  @ApiProperty({ example: 'ord_1' })
  id!: string;

  @ApiProperty({ enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'] })
  status!: string;

  @ApiProperty()
  total!: number;

  @ApiProperty({ minLength: 3, maxLength: 3, example: 'USD' })
  currency!: string;

  @ApiProperty()
  itemCount!: number;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;
}

export class CreateOrderBody {
  @ApiProperty()
  customerId!: string;

  @ApiProperty({ type: () => [OrderLineItem] })
  items!: OrderLineItem[];

  @ApiProperty({ type: () => Address })
  shippingAddress!: Address;

  @ApiProperty({ required: false })
  couponCode?: string;
}

export class ShipmentTrackingEventNotificationDelivery {
  @ApiProperty({ format: 'date-time' })
  timestamp!: string;

  @ApiProperty()
  location!: string;

  @ApiProperty()
  description!: string;

  @ApiProperty()
  status!: string;
}
