import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  @Get()
  @ApiOperation({ summary: 'List notifications' })
  @ApiQuery({ name: 'read', required: false, schema: { type: 'boolean' }, description: 'Filter by read status.' })
  @ApiQuery({ name: 'type', required: false, enum: ['order', 'system', 'marketing', 'security'] })
  @ApiQuery({ name: 'page', required: false, schema: { type: 'integer', default: 1 } })
  @ApiQuery({ name: 'limit', required: false, schema: { type: 'integer', default: 20 } })
  @ApiOkResponse({
    description: 'Notifications list.',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              type: { type: 'string', enum: ['order', 'system', 'marketing', 'security'] },
              title: { type: 'string' },
              body: { type: 'string' },
              read: { type: 'boolean' },
              actionUrl: { type: 'string', format: 'uri', nullable: true },
              createdAt: { type: 'string', format: 'date-time' },
            },
          },
        },
        total: { type: 'integer' },
        unreadCount: { type: 'integer' },
      },
    },
  })
  listNotifications() {
    return { data: [], total: 0, unreadCount: 0 };
  }

  @Post()
  @ApiBody({
    schema: {
      type: 'object',
      required: ['type', 'title', 'body', 'userIds'],
      properties: {
        type: { type: 'string', enum: ['order', 'system', 'marketing', 'security'] },
        title: { type: 'string', maxLength: 100 },
        body: { type: 'string', maxLength: 500 },
        userIds: { type: 'array', items: { type: 'string' }, description: 'Recipient user IDs.' },
        actionUrl: { type: 'string', format: 'uri' },
        sendEmail: { type: 'boolean', default: false },
        sendPush: { type: 'boolean', default: false },
        scheduledAt: { type: 'string', format: 'date-time', description: 'Schedule delivery. Omit to send immediately.' },
      },
    },
  })
  @ApiCreatedResponse({ description: 'Notification sent.' })
  sendNotification(@Body() body: any) {
    return { id: 'notif_1', ...body, sentCount: body.userIds?.length ?? 0 };
  }

  @Patch(':id/read')
  @ApiOkResponse({ description: 'Notification marked as read.' })
  markAsRead(@Param('id') id: string) {
    return { id, read: true };
  }

  @Post('mark-all-read')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['order', 'system', 'marketing', 'security'], description: 'Mark only notifications of this type.' },
      },
    },
  })
  @ApiOkResponse({ description: 'All notifications marked as read.', schema: { type: 'object', properties: { markedCount: { type: 'integer' } } } })
  markAllRead(@Body() body: any) {
    return { markedCount: 0 };
  }

  @Delete(':id')
  @ApiNoContentResponse({ description: 'Notification deleted.' })
  deleteNotification(@Param('id') id: string) {
    return;
  }

  @Get('preferences')
  @ApiOperation({ summary: 'Get notification preferences' })
  @ApiOkResponse({
    description: 'Notification preferences.',
    schema: {
      type: 'object',
      properties: {
        channels: {
          type: 'object',
          properties: {
            email: { type: 'boolean' },
            push: { type: 'boolean' },
            sms: { type: 'boolean' },
          },
        },
        types: {
          type: 'object',
          additionalProperties: {
            type: 'object',
            properties: {
              email: { type: 'boolean' },
              push: { type: 'boolean' },
              sms: { type: 'boolean' },
            },
          },
        },
        quietHours: {
          type: 'object',
          properties: {
            enabled: { type: 'boolean' },
            start: { type: 'string', pattern: '^[0-2][0-9]:[0-5][0-9]$', example: '22:00' },
            end: { type: 'string', pattern: '^[0-2][0-9]:[0-5][0-9]$', example: '08:00' },
            timezone: { type: 'string', example: 'America/New_York' },
          },
        },
      },
    },
  })
  getPreferences() {
    return { channels: { email: true, push: true, sms: false }, types: {}, quietHours: { enabled: false } };
  }

  @Patch('preferences')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        channels: {
          type: 'object',
          properties: {
            email: { type: 'boolean' },
            push: { type: 'boolean' },
            sms: { type: 'boolean' },
          },
        },
        types: {
          type: 'object',
          additionalProperties: {
            type: 'object',
            properties: {
              email: { type: 'boolean' },
              push: { type: 'boolean' },
              sms: { type: 'boolean' },
            },
          },
        },
        quietHours: {
          type: 'object',
          properties: {
            enabled: { type: 'boolean' },
            start: { type: 'string', example: '22:00' },
            end: { type: 'string', example: '08:00' },
            timezone: { type: 'string' },
          },
        },
      },
    },
  })
  @ApiOkResponse({ description: 'Preferences updated.' })
  updatePreferences(@Body() body: any) {
    return body;
  }

  @Post('test')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['channel'],
      properties: {
        channel: { type: 'string', enum: ['email', 'push', 'sms'] },
      },
    },
  })
  @ApiOkResponse({ description: 'Test notification sent.' })
  sendTestNotification(@Body() body: any) {
    return { channel: body.channel, sent: true };
  }
}
