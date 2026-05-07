import { ApiProperty } from '@nestjs/swagger';

export class User {
  @ApiProperty({ example: 'usr_1' })
  id!: string;

  @ApiProperty({ example: 'Ada Lovelace' })
  name!: string;

  @ApiProperty({ example: 'ada@example.com', format: 'email' })
  email!: string;

  @ApiProperty({ enum: ['admin', 'member'], default: 'member' })
  role!: 'admin' | 'member';
}

export class CreateUserBody {
  @ApiProperty({ example: 'Katherine Johnson' })
  name!: string;

  @ApiProperty({ example: 'katherine@example.com', format: 'email' })
  email!: string;

  @ApiProperty({ enum: ['admin', 'member'], default: 'member', required: false })
  role?: 'admin' | 'member';
}

export class UpdatePlanningSetupSegmentBody {
  @ApiProperty({ required: false })
  name?: string;

  @ApiProperty({ required: false, format: 'email' })
  email?: string;

  @ApiProperty({ enum: ['admin', 'member'], required: false })
  role?: 'admin' | 'member';
}
