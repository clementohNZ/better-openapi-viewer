import { Body, Controller, Delete, Get, Headers, Param, Patch, Post, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiHeader,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('webhooks')
@ApiBearerAuth()
@Controller('webhooks')
export class WebhooksController {
  @Get()
  @ApiOkResponse({
    description: 'Registered webhooks.',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          url: { type: 'string', format: 'uri' },
          events: { type: 'array', items: { type: 'string' } },
          isActive: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' },
          lastDeliveryAt: { type: 'string', format: 'date-time', nullable: true },
          successRate: { type: 'number', description: 'Success rate over last 30 days, 0-1.' },
        },
      },
    },
  })
  listWebhooks() {
    return [];
  }

  @Post()
  @ApiBody({
    schema: {
      type: 'object',
      required: ['url', 'events'],
      properties: {
        url: { type: 'string', format: 'uri', example: 'https://myapp.example.com/webhooks' },
        events: {
          type: 'array',
          items: {
            type: 'string',
            enum: [
              'order.created', 'order.updated', 'order.cancelled', 'order.shipped', 'order.delivered',
              'user.created', 'user.updated', 'user.deleted',
              'product.created', 'product.updated', 'product.deleted',
              'payment.succeeded', 'payment.failed', 'refund.created',
            ],
          },
          minItems: 1,
        },
        description: { type: 'string', maxLength: 200 },
        headers: {
          type: 'object',
          additionalProperties: { type: 'string' },
          description: 'Custom headers to include with every delivery.',
        },
        signingAlgorithm: { type: 'string', enum: ['hmac-sha256', 'hmac-sha512'], default: 'hmac-sha256' },
      },
    },
  })
  @ApiCreatedResponse({
    description: 'Webhook registered.',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        url: { type: 'string' },
        events: { type: 'array', items: { type: 'string' } },
        secret: { type: 'string', description: 'Signing secret. Only returned once at creation.' },
        isActive: { type: 'boolean' },
      },
    },
  })
  createWebhook(@Body() body: any) {
    return { id: 'wh_1', ...body, secret: 'whsec_...', isActive: true };
  }

  @Get(':id')
  @ApiOkResponse({ description: 'Webhook detail.' })
  getWebhook(@Param('id') id: string) {
    return { id, url: 'https://example.com/wh', events: [], isActive: true };
  }

  @Patch(':id')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        url: { type: 'string', format: 'uri' },
        events: { type: 'array', items: { type: 'string' } },
        description: { type: 'string' },
        isActive: { type: 'boolean' },
        headers: { type: 'object', additionalProperties: { type: 'string' } },
      },
    },
  })
  @ApiOkResponse({ description: 'Webhook updated.' })
  updateWebhook(@Param('id') id: string, @Body() body: any) {
    return { id, ...body };
  }

  @Delete(':id')
  @ApiNoContentResponse({ description: 'Webhook deleted.' })
  deleteWebhook(@Param('id') id: string) {
    return;
  }

  @Post(':id/test')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        event: { type: 'string', description: 'Event type to simulate. Defaults to the first registered event.' },
        payload: { type: 'object', additionalProperties: true, description: 'Override the test payload.' },
      },
    },
  })
  @ApiOkResponse({
    description: 'Test delivery result.',
    schema: {
      type: 'object',
      properties: {
        deliveryId: { type: 'string' },
        statusCode: { type: 'integer' },
        responseBody: { type: 'string' },
        durationMs: { type: 'integer' },
        success: { type: 'boolean' },
      },
    },
  })
  testWebhook(@Param('id') id: string, @Body() body: any) {
    return { deliveryId: 'del_1', statusCode: 200, responseBody: '', durationMs: 42, success: true };
  }

  @Get(':id/deliveries')
  @ApiQuery({ name: 'status', required: false, enum: ['success', 'failed', 'pending'] })
  @ApiQuery({ name: 'event', required: false })
  @ApiQuery({ name: 'page', required: false, schema: { type: 'integer', default: 1 } })
  @ApiOkResponse({
    description: 'Webhook delivery history.',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              event: { type: 'string' },
              statusCode: { type: 'integer', nullable: true },
              success: { type: 'boolean' },
              attempts: { type: 'integer' },
              nextRetryAt: { type: 'string', format: 'date-time', nullable: true },
              createdAt: { type: 'string', format: 'date-time' },
            },
          },
        },
        total: { type: 'integer' },
      },
    },
  })
  getDeliveries(@Param('id') id: string) {
    return { data: [], total: 0 };
  }

  @Post(':id/rotate-secret')
  @ApiOkResponse({
    description: 'New signing secret.',
    schema: {
      type: 'object',
      properties: {
        secret: { type: 'string', description: 'New signing secret. Only returned once.' },
        rotatedAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  rotateSecret(@Param('id') id: string) {
    return { secret: 'whsec_...', rotatedAt: new Date().toISOString() };
  }
}
