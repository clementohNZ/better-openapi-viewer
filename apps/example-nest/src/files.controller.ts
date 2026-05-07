import { Body, Controller, Delete, Get, Headers, Param, Patch, Post, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiHeader,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('files')
@ApiBearerAuth()
@Controller('files')
export class FilesController {
  @Post('upload')
  @ApiConsumes('multipart/form-data')
  @ApiHeader({ name: 'x-upload-checksum', required: false, description: 'SHA-256 hex digest of the file for integrity verification.' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary', description: 'File to upload.' },
        folder: { type: 'string', description: 'Destination folder path.' },
        isPublic: { type: 'boolean', default: false },
        metadata: {
          type: 'object',
          additionalProperties: { type: 'string' },
          description: 'Custom key-value metadata.',
        },
      },
    },
  })
  @ApiCreatedResponse({
    description: 'File uploaded.',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        filename: { type: 'string' },
        contentType: { type: 'string' },
        size: { type: 'integer', description: 'File size in bytes.' },
        url: { type: 'string', format: 'uri' },
        folder: { type: 'string' },
        isPublic: { type: 'boolean' },
        checksum: { type: 'string' },
        createdAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  uploadFile(@Headers('x-upload-checksum') checksum?: string) {
    return { id: 'file_1', filename: 'upload.png', contentType: 'image/png', size: 102400, url: 'https://cdn.example.com/file_1', isPublic: false };
  }

  @Get()
  @ApiQuery({ name: 'folder', required: false })
  @ApiQuery({ name: 'contentType', required: false, description: 'Filter by MIME type prefix e.g. "image/".' })
  @ApiQuery({ name: 'page', required: false, schema: { type: 'integer', default: 1 } })
  @ApiQuery({ name: 'limit', required: false, schema: { type: 'integer', default: 20 } })
  @ApiOkResponse({
    description: 'File listing.',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              filename: { type: 'string' },
              contentType: { type: 'string' },
              size: { type: 'integer' },
              url: { type: 'string', format: 'uri' },
              isPublic: { type: 'boolean' },
              createdAt: { type: 'string', format: 'date-time' },
            },
          },
        },
        total: { type: 'integer' },
        page: { type: 'integer' },
      },
    },
  })
  listFiles() {
    return { data: [], total: 0, page: 1 };
  }

  @Get(':id')
  @ApiOkResponse({ description: 'File metadata.' })
  getFile(@Param('id') id: string) {
    return { id, filename: 'example.png', contentType: 'image/png', size: 102400 };
  }

  @Patch(':id/metadata')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        filename: { type: 'string' },
        folder: { type: 'string' },
        isPublic: { type: 'boolean' },
        metadata: { type: 'object', additionalProperties: { type: 'string' } },
      },
    },
  })
  @ApiOkResponse({ description: 'File metadata updated.' })
  updateMetadata(@Param('id') id: string, @Body() body: any) {
    return { id, ...body };
  }

  @Delete(':id')
  @ApiNoContentResponse({ description: 'File deleted.' })
  deleteFile(@Param('id') id: string) {
    return;
  }

  @Post(':id/presigned-url')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        operation: { type: 'string', enum: ['get', 'put'], default: 'get' },
        expiresIn: { type: 'integer', minimum: 60, maximum: 86400, default: 3600, description: 'Seconds until URL expires.' },
        contentType: { type: 'string', description: 'Required when operation is "put".' },
      },
    },
  })
  @ApiCreatedResponse({
    description: 'Presigned URL.',
    schema: {
      type: 'object',
      properties: {
        url: { type: 'string', format: 'uri' },
        method: { type: 'string', enum: ['GET', 'PUT'] },
        expiresAt: { type: 'string', format: 'date-time' },
        headers: { type: 'object', additionalProperties: { type: 'string' }, description: 'Required request headers for PUT operations.' },
      },
    },
  })
  createPresignedUrl(@Param('id') id: string, @Body() body: any) {
    return { url: 'https://storage.example.com/...', method: 'GET', expiresAt: new Date(Date.now() + 3600000).toISOString() };
  }

  @Get(':id/versions')
  @ApiOkResponse({
    description: 'File version history.',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          versionId: { type: 'string' },
          size: { type: 'integer' },
          checksum: { type: 'string' },
          createdBy: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
          isCurrent: { type: 'boolean' },
        },
      },
    },
  })
  getVersions(@Param('id') id: string) {
    return [];
  }

  @Post('batch-delete')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['ids'],
      properties: {
        ids: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 100 },
      },
    },
  })
  @ApiOkResponse({
    description: 'Batch delete result.',
    schema: {
      type: 'object',
      properties: {
        deleted: { type: 'integer' },
        failed: { type: 'integer' },
        errors: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, message: { type: 'string' } } } },
      },
    },
  })
  batchDelete(@Body() body: any) {
    return { deleted: 0, failed: 0, errors: [] };
  }
}
