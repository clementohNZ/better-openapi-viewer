import { Body, Controller, Delete, Get, Headers, Param, Post, Query } from '@nestjs/common';
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

@ApiTags('reports')
@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  @Get()
  @ApiOperation({ summary: 'List generated reports' })
  @ApiQuery({ name: 'status', required: false, enum: ['pending', 'running', 'complete', 'failed'] })
  @ApiQuery({ name: 'page', required: false, schema: { type: 'integer', default: 1 } })
  @ApiOkResponse({
    description: 'Generated reports list.',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              type: { type: 'string' },
              status: { type: 'string', enum: ['pending', 'running', 'complete', 'failed'] },
              format: { type: 'string', enum: ['csv', 'xlsx', 'pdf', 'json'] },
              size: { type: 'integer', nullable: true, description: 'File size in bytes once complete.' },
              createdAt: { type: 'string', format: 'date-time' },
              completedAt: { type: 'string', format: 'date-time', nullable: true },
              expiresAt: { type: 'string', format: 'date-time', nullable: true },
            },
          },
        },
        total: { type: 'integer' },
      },
    },
  })
  listReports() {
    return { data: [], total: 0 };
  }

  @Post('generate')
  @ApiOperation({ summary: 'Generate a new report' })
  @ApiHeader({ name: 'x-callback-url', required: false, description: 'Webhook URL to notify when report is ready.' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['type', 'format'],
      properties: {
        type: {
          type: 'string',
          enum: ['sales', 'inventory', 'customers', 'orders', 'products', 'tax', 'custom'],
        },
        format: { type: 'string', enum: ['csv', 'xlsx', 'pdf', 'json'] },
        name: { type: 'string', description: 'Custom report name.' },
        dateRange: {
          type: 'object',
          required: ['from', 'to'],
          properties: {
            from: { type: 'string', format: 'date' },
            to: { type: 'string', format: 'date' },
          },
        },
        filters: { type: 'object', additionalProperties: true },
        columns: { type: 'array', items: { type: 'string' }, description: 'Specific columns to include. Omit for all.' },
        groupBy: { type: 'string', enum: ['day', 'week', 'month', 'quarter', 'year', 'product', 'category', 'customer'] },
        includeCharts: { type: 'boolean', default: false, description: 'Include charts (PDF only).' },
      },
    },
  })
  @ApiCreatedResponse({
    description: 'Report generation queued.',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        status: { type: 'string', enum: ['pending'] },
        estimatedDurationSeconds: { type: 'integer' },
      },
    },
  })
  generateReport(@Body() body: any, @Headers('x-callback-url') callbackUrl?: string) {
    return { id: 'rpt_1', status: 'pending', estimatedDurationSeconds: 30 };
  }

  @Get('templates')
  @ApiOkResponse({
    description: 'Available report templates.',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          description: { type: 'string' },
          type: { type: 'string' },
          supportedFormats: { type: 'array', items: { type: 'string', enum: ['csv', 'xlsx', 'pdf', 'json'] } },
          availableColumns: { type: 'array', items: { type: 'string' } },
          availableFilters: { type: 'array', items: { type: 'object', properties: { field: { type: 'string' }, type: { type: 'string' } } } },
        },
      },
    },
  })
  getTemplates() {
    return [];
  }

  @Get(':id')
  @ApiOkResponse({ description: 'Report detail and status.' })
  getReport(@Param('id') id: string) {
    return { id, status: 'pending' };
  }

  @Get(':id/download')
  @ApiOkResponse({
    description: 'Presigned download URL for the completed report.',
    schema: {
      type: 'object',
      properties: {
        url: { type: 'string', format: 'uri' },
        filename: { type: 'string' },
        contentType: { type: 'string' },
        expiresAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  downloadReport(@Param('id') id: string) {
    return { url: 'https://export.example.com/...', filename: 'report.csv', contentType: 'text/csv', expiresAt: new Date(Date.now() + 3600000).toISOString() };
  }

  @Delete(':id')
  @ApiNoContentResponse({ description: 'Report deleted.' })
  deleteReport(@Param('id') id: string) {
    return;
  }
}
