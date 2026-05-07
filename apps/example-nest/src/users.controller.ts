import { Body, Controller, Delete, Get, Headers, Param, Patch, Post, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiExtraModels,
  ApiHeader,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import { CreateUserBody, UpdateUserBody, User } from './users.dto.js';

@ApiTags('users')
@Controller('users')
@ApiExtraModels(User, CreateUserBody, UpdateUserBody)
export class UsersController {
  @Get()
  @ApiOperation({ summary: 'List users' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'role', enum: ['admin', 'member'], required: false })
  @ApiHeader({ name: 'x-request-id', required: false })
  @ApiOkResponse({
    description: 'List of users.',
    schema: {
      type: 'object',
      properties: {
        data: { type: 'array', items: { $ref: getSchemaPath(User) } },
      },
    },
  })
  listUsers(@Query('search') search?: string, @Query('role') role?: string, @Headers('x-request-id') requestId?: string) {
    return {
      requestId,
      data: [
        { id: 'usr_1', name: 'Ada Lovelace', email: 'ada@example.com', role: 'admin' },
        { id: 'usr_2', name: 'Grace Hopper', email: 'grace@example.com', role: 'member' },
      ].filter((user) => (!search || user.name.toLowerCase().includes(search.toLowerCase())) && (!role || user.role === role)),
    };
  }

  @Post()
  @ApiOperation({ summary: 'Create a new user' })
  @ApiBearerAuth()
  @ApiBody({ schema: { $ref: getSchemaPath(CreateUserBody) } })
  @ApiCreatedResponse({
    description: 'Created user.',
    schema: { $ref: getSchemaPath(User) },
  })
  createUser(@Body() body: CreateUserBody) {
    return { id: 'usr_3', role: 'member', ...body };
  }

  @Get('search')
  @ApiQuery({ name: 'q', required: true, description: 'Full-text search query.' })
  @ApiQuery({ name: 'role', enum: ['admin', 'member'], required: false })
  @ApiQuery({ name: 'limit', required: false, schema: { type: 'integer', minimum: 1, maximum: 100, default: 25 } })
  @ApiQuery({ name: 'tag', required: false, isArray: true, description: 'Repeat to filter by multiple tags.' })
  @ApiOkResponse({
    description: 'Search results.',
    schema: {
      type: 'object',
      properties: {
        data: { type: 'array', items: { $ref: getSchemaPath(User) } },
        total: { type: 'integer' },
      },
    },
  })
  searchUsers(@Query('q') q: string, @Query('role') role?: string, @Query('limit') limit?: string, @Query('tag') tag?: string | string[]) {
    return {
      query: q,
      data: [{ id: 'usr_1', name: 'Ada Lovelace', email: 'ada@example.com', role: 'admin' }],
      total: 1,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a user by ID' })
  @ApiOkResponse({ description: 'User detail.', schema: { $ref: getSchemaPath(User) } })
  getUser(@Param('id') id: string) {
    return { id, name: 'Ada Lovelace', email: 'ada@example.com', role: 'admin' };
  }

  @Patch(':id')
  @ApiBearerAuth()
  @ApiBody({ schema: { $ref: getSchemaPath(UpdateUserBody) } })
  @ApiOkResponse({ description: 'Updated user.', schema: { $ref: getSchemaPath(User) } })
  updateUser(@Param('id') id: string, @Body() body: UpdateUserBody) {
    return { id, ...body };
  }

  @Delete(':id')
  @ApiBearerAuth()
  @ApiNoContentResponse({ description: 'User deleted.' })
  deleteUser(@Param('id') id: string) {
    return;
  }
}
