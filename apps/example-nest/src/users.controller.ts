import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOkResponse, ApiQuery, ApiTags } from '@nestjs/swagger';

@ApiTags('users')
@Controller('users')
export class UsersController {
  @Get()
  @ApiQuery({ name: 'search', required: false })
  @ApiOkResponse({ description: 'List users.' })
  listUsers(@Query('search') search?: string) {
    return {
      data: [
        { id: 'usr_1', name: 'Ada Lovelace' },
        { id: 'usr_2', name: 'Grace Hopper' },
      ].filter((user) => !search || user.name.toLowerCase().includes(search.toLowerCase())),
    };
  }

  @Get(':id')
  @ApiOkResponse({ description: 'Get a user by id.' })
  getUser(@Param('id') id: string) {
    return { id, name: 'Ada Lovelace' };
  }
}
