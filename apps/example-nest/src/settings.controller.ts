import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiHeader,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('settings')
@ApiBearerAuth()
@Controller('settings')
export class SettingsController {
  @Get()
  @ApiOperation({ summary: 'Get general settings' })
  @ApiOkResponse({
    description: 'General settings.',
    schema: {
      type: 'object',
      properties: {
        storeName: { type: 'string' },
        storeUrl: { type: 'string', format: 'uri' },
        supportEmail: { type: 'string', format: 'email' },
        timezone: { type: 'string', example: 'America/New_York' },
        defaultCurrency: { type: 'string', minLength: 3, maxLength: 3, example: 'USD' },
        dateFormat: { type: 'string', example: 'MM/DD/YYYY' },
        logoUrl: { type: 'string', format: 'uri', nullable: true },
        faviconUrl: { type: 'string', format: 'uri', nullable: true },
        maintenanceMode: { type: 'boolean' },
      },
    },
  })
  getSettings() {
    return { storeName: 'My Store', timezone: 'UTC', defaultCurrency: 'USD', maintenanceMode: false };
  }

  @Patch()
  @ApiOperation({ summary: 'Update general settings' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        storeName: { type: 'string', minLength: 1, maxLength: 100 },
        storeUrl: { type: 'string', format: 'uri' },
        supportEmail: { type: 'string', format: 'email' },
        timezone: { type: 'string' },
        defaultCurrency: { type: 'string', minLength: 3, maxLength: 3 },
        dateFormat: { type: 'string' },
        maintenanceMode: { type: 'boolean' },
      },
    },
  })
  @ApiOkResponse({ description: 'Settings updated.' })
  updateSettings(@Body() body: any) {
    return body;
  }

  @Get('security')
  @ApiOperation({ summary: 'Get security settings' })
  @ApiOkResponse({
    description: 'Security settings.',
    schema: {
      type: 'object',
      properties: {
        passwordPolicy: {
          type: 'object',
          properties: {
            minLength: { type: 'integer' },
            requireUppercase: { type: 'boolean' },
            requireNumbers: { type: 'boolean' },
            requireSymbols: { type: 'boolean' },
            expiryDays: { type: 'integer', nullable: true },
          },
        },
        sessionPolicy: {
          type: 'object',
          properties: {
            maxSessionDurationHours: { type: 'integer' },
            allowConcurrentSessions: { type: 'boolean' },
            requireMfaForAdmins: { type: 'boolean' },
          },
        },
        ipAllowlist: { type: 'array', items: { type: 'string' }, description: 'Allowed IP addresses/CIDR ranges.' },
        auditLogRetentionDays: { type: 'integer' },
      },
    },
  })
  getSecuritySettings() {
    return { passwordPolicy: {}, sessionPolicy: {}, ipAllowlist: [], auditLogRetentionDays: 90 };
  }

  @Patch('security')
  @ApiOperation({ summary: 'Update security settings' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        passwordPolicy: {
          type: 'object',
          properties: {
            minLength: { type: 'integer', minimum: 8, maximum: 128 },
            requireUppercase: { type: 'boolean' },
            requireNumbers: { type: 'boolean' },
            requireSymbols: { type: 'boolean' },
            expiryDays: { type: 'integer', nullable: true, minimum: 7 },
          },
        },
        sessionPolicy: {
          type: 'object',
          properties: {
            maxSessionDurationHours: { type: 'integer', minimum: 1, maximum: 720 },
            allowConcurrentSessions: { type: 'boolean' },
            requireMfaForAdmins: { type: 'boolean' },
          },
        },
        ipAllowlist: { type: 'array', items: { type: 'string' } },
        auditLogRetentionDays: { type: 'integer', minimum: 30 },
      },
    },
  })
  @ApiOkResponse({ description: 'Security settings updated.' })
  updateSecuritySettings(@Body() body: any) {
    return body;
  }

  @Get('billing')
  @ApiOperation({ summary: 'Get billing information' })
  @ApiOkResponse({
    description: 'Billing information.',
    schema: {
      type: 'object',
      properties: {
        plan: { type: 'string', enum: ['free', 'starter', 'pro', 'enterprise'] },
        status: { type: 'string', enum: ['active', 'trialing', 'past_due', 'cancelled'] },
        currentPeriodEnd: { type: 'string', format: 'date-time' },
        cancelAtPeriodEnd: { type: 'boolean' },
        paymentMethods: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              type: { type: 'string', enum: ['card', 'bank_account'] },
              last4: { type: 'string' },
              brand: { type: 'string' },
              expiryMonth: { type: 'integer' },
              expiryYear: { type: 'integer' },
              isDefault: { type: 'boolean' },
            },
          },
        },
        upcomingInvoice: {
          type: 'object',
          nullable: true,
          properties: {
            amount: { type: 'number' },
            currency: { type: 'string' },
            dueDate: { type: 'string', format: 'date' },
          },
        },
      },
    },
  })
  getBillingSettings() {
    return { plan: 'free', status: 'active', paymentMethods: [] };
  }

  @Post('billing/payment-method')
  @ApiOperation({ summary: 'Add a payment method' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['paymentMethodId'],
      properties: {
        paymentMethodId: { type: 'string', description: 'Stripe PaymentMethod ID.' },
        setAsDefault: { type: 'boolean', default: false },
      },
    },
  })
  @ApiCreatedResponse({ description: 'Payment method added.' })
  addPaymentMethod(@Body() body: any) {
    return { id: 'pm_1', type: 'card', last4: '4242', brand: 'visa', isDefault: body.setAsDefault };
  }

  @Delete('billing/payment-method/:id')
  @ApiOperation({ summary: 'Remove a payment method' })
  @ApiNoContentResponse({ description: 'Payment method removed.' })
  deletePaymentMethod(@Param('id') id: string) {
    return;
  }

  @Get('audit-log')
  @ApiOperation({ summary: 'Get audit log' })
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'action', required: false, description: 'Filter by action type.' })
  @ApiQuery({ name: 'from', required: false, schema: { type: 'string', format: 'date-time' } })
  @ApiQuery({ name: 'to', required: false, schema: { type: 'string', format: 'date-time' } })
  @ApiQuery({ name: 'page', required: false, schema: { type: 'integer', default: 1 } })
  @ApiOkResponse({
    description: 'Audit log entries.',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              action: { type: 'string' },
              actor: { type: 'object', properties: { id: { type: 'string' }, email: { type: 'string' }, name: { type: 'string' } } },
              resource: { type: 'object', properties: { type: { type: 'string' }, id: { type: 'string' } } },
              ipAddress: { type: 'string' },
              userAgent: { type: 'string' },
              metadata: { type: 'object', additionalProperties: true },
              timestamp: { type: 'string', format: 'date-time' },
            },
          },
        },
        total: { type: 'integer' },
      },
    },
  })
  getAuditLog() {
    return { data: [], total: 0 };
  }
}
