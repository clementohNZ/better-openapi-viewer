import { Body, Controller, Delete, Get, Headers, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiCreatedResponse, ApiHeader, ApiNoContentResponse, ApiOkResponse, ApiQuery, ApiTags } from '@nestjs/swagger';

type CreateUserDto = {
  name: string;
  email: string;
  role?: 'admin' | 'member';
};

type UpdateUserDto = Partial<CreateUserDto>;

@ApiTags('users')
@Controller('users')
export class UsersController {
  @Get()
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'role', enum: ['admin', 'member'], required: false })
  @ApiHeader({ name: 'x-request-id', required: false })
  @ApiOkResponse({ description: 'List users.' })
  listUsers(@Query('search') search?: string, @Query('role') role?: string, @Headers('x-request-id') requestId?: string) {
    return {
      requestId,
      data: [
        { id: 'usr_1', name: 'Ada Lovelace', role: 'admin' },
        { id: 'usr_2', name: 'Grace Hopper', role: 'member' },
      ].filter((user) => (!search || user.name.toLowerCase().includes(search.toLowerCase())) && (!role || user.role === role)),
    };
  }

  @Post()
  @ApiBearerAuth()
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name', 'email'],
      properties: {
        name: { type: 'string', example: 'Katherine Johnson' },
        email: { type: 'string', format: 'email', example: 'katherine@example.com' },
        role: { type: 'string', enum: ['admin', 'member'], default: 'member' },
      },
    },
  })
  @ApiCreatedResponse({ description: 'Created user.' })
  createUser(@Body() body: CreateUserDto) {
    return { id: 'usr_3', role: 'member', ...body };
  }

  @Get(':id')
  @ApiOkResponse({ description: 'Get a user by id.' })
  getUser(@Param('id') id: string) {
    return { id, name: 'Ada Lovelace' };
  }

  @Patch(':id')
  @ApiBearerAuth()
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        email: { type: 'string', format: 'email' },
        role: { type: 'string', enum: ['admin', 'member'] },
      },
    },
  })
  @ApiOkResponse({ description: 'Updated user.' })
  updateUser(@Param('id') id: string, @Body() body: UpdateUserDto) {
    return { id, ...body };
  }

  @Delete(':id')
  @ApiBearerAuth()
  @ApiNoContentResponse({ description: 'Deleted user.' })
  deleteUser(@Param('id') id: string) {
    return { id, deleted: true };
  }
}
