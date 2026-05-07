import { Body, Controller, Get, Headers, Param, Patch, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiHeader,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  @Post('login')
  @ApiOperation({ summary: 'Authenticate with email and password' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['email', 'password'],
      properties: {
        email: { type: 'string', format: 'email', example: 'user@example.com' },
        password: { type: 'string', format: 'password', minLength: 8 },
        mfaCode: { type: 'string', minLength: 6, maxLength: 6, description: 'TOTP code if MFA is enabled.' },
        rememberMe: { type: 'boolean', default: false },
      },
    },
  })
  @ApiOkResponse({
    description: 'Authenticated successfully.',
    schema: {
      type: 'object',
      properties: {
        accessToken: { type: 'string' },
        refreshToken: { type: 'string' },
        expiresIn: { type: 'integer', description: 'Seconds until access token expires.' },
        tokenType: { type: 'string', enum: ['Bearer'], default: 'Bearer' },
        user: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            name: { type: 'string' },
            role: { type: 'string', enum: ['admin', 'member'] },
            mfaEnabled: { type: 'boolean' },
          },
        },
      },
    },
  })
  login(@Body() body: any) {
    return { accessToken: 'eyJ...', refreshToken: 'eyJ...', expiresIn: 3600, tokenType: 'Bearer' };
  }

  @Post('register')
  @ApiOperation({ summary: 'Register a new account' })
  @ApiHeader({ name: 'x-invite-token', required: false, description: 'Invitation token for restricted registration.' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['email', 'password', 'name'],
      properties: {
        email: { type: 'string', format: 'email' },
        password: { type: 'string', format: 'password', minLength: 8 },
        name: { type: 'string', minLength: 2, maxLength: 100 },
        acceptedTerms: { type: 'boolean', description: 'Must be true to register.' },
      },
    },
  })
  @ApiCreatedResponse({ description: 'Account created. Check email for verification link.' })
  register(@Body() body: any) {
    return { id: 'usr_1', email: body.email, name: body.name, emailVerified: false };
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['refreshToken'],
      properties: {
        refreshToken: { type: 'string' },
      },
    },
  })
  @ApiOkResponse({
    description: 'New access token issued.',
    schema: {
      type: 'object',
      properties: {
        accessToken: { type: 'string' },
        expiresIn: { type: 'integer' },
      },
    },
  })
  refresh(@Body() body: any) {
    return { accessToken: 'eyJ...', expiresIn: 3600 };
  }

  @Post('logout')
  @ApiOperation({ summary: 'Log out and revoke tokens' })
  @ApiBearerAuth()
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        refreshToken: { type: 'string', description: 'Revoke specific refresh token. Omit to revoke all.' },
        allDevices: { type: 'boolean', default: false, description: 'Revoke all sessions for this user.' },
      },
    },
  })
  @ApiNoContentResponse({ description: 'Logged out.' })
  logout(@Body() body: any) {
    return;
  }

  @Post('forgot-password')
  @ApiOperation({ summary: 'Request a password reset email' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['email'],
      properties: {
        email: { type: 'string', format: 'email' },
      },
    },
  })
  @ApiOkResponse({ description: 'If the email exists, a reset link was sent.' })
  forgotPassword(@Body() body: any) {
    return { message: 'If the email exists, a reset link was sent.' };
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Reset password with token' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['token', 'password'],
      properties: {
        token: { type: 'string', description: 'Token from password reset email.' },
        password: { type: 'string', format: 'password', minLength: 8 },
        confirmPassword: { type: 'string', format: 'password' },
      },
    },
  })
  @ApiOkResponse({ description: 'Password reset successfully.' })
  resetPassword(@Body() body: any) {
    return { message: 'Password reset successfully.' };
  }

  @Post('verify-email')
  @ApiOperation({ summary: 'Verify email address' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['token'],
      properties: {
        token: { type: 'string', description: 'Verification token from email.' },
      },
    },
  })
  @ApiOkResponse({ description: 'Email verified.' })
  verifyEmail(@Body() body: any) {
    return { emailVerified: true };
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiBearerAuth()
  @ApiOkResponse({
    description: 'Current authenticated user.',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        email: { type: 'string', format: 'email' },
        name: { type: 'string' },
        avatarUrl: { type: 'string', format: 'uri', nullable: true },
        role: { type: 'string', enum: ['admin', 'member'] },
        mfaEnabled: { type: 'boolean' },
        emailVerified: { type: 'boolean' },
        createdAt: { type: 'string', format: 'date-time' },
        lastLoginAt: { type: 'string', format: 'date-time', nullable: true },
      },
    },
  })
  getMe() {
    return { id: 'usr_1', email: 'user@example.com', name: 'Ada Lovelace', role: 'admin', mfaEnabled: false };
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiBearerAuth()
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', minLength: 2, maxLength: 100 },
        avatarUrl: { type: 'string', format: 'uri', nullable: true },
        currentPassword: { type: 'string', format: 'password', description: 'Required when changing password.' },
        newPassword: { type: 'string', format: 'password', minLength: 8 },
      },
    },
  })
  @ApiOkResponse({ description: 'Profile updated.' })
  updateMe(@Body() body: any) {
    return { id: 'usr_1', ...body };
  }

  @Post('mfa/setup')
  @ApiOperation({ summary: 'Set up multi-factor authentication' })
  @ApiBearerAuth()
  @ApiOkResponse({
    description: 'MFA setup initiated. Scan QR code with authenticator app.',
    schema: {
      type: 'object',
      properties: {
        secret: { type: 'string', description: 'Base32 TOTP secret.' },
        qrCodeUrl: { type: 'string', format: 'uri', description: 'Data URI of QR code image.' },
        backupCodes: { type: 'array', items: { type: 'string' }, description: 'One-time backup codes.' },
      },
    },
  })
  setupMfa() {
    return { secret: 'JBSWY3DPEHPK3PXP', qrCodeUrl: 'data:image/png;base64,...', backupCodes: [] };
  }

  @Post('mfa/verify')
  @ApiOperation({ summary: 'Verify and enable MFA' })
  @ApiBearerAuth()
  @ApiBody({
    schema: {
      type: 'object',
      required: ['code'],
      properties: {
        code: { type: 'string', minLength: 6, maxLength: 6, description: 'TOTP code from authenticator app.' },
      },
    },
  })
  @ApiOkResponse({ description: 'MFA enabled.' })
  verifyMfa(@Body() body: any) {
    return { mfaEnabled: true };
  }

  @Post('mfa/disable')
  @ApiOperation({ summary: 'Disable multi-factor authentication' })
  @ApiBearerAuth()
  @ApiBody({
    schema: {
      type: 'object',
      required: ['password'],
      properties: {
        password: { type: 'string', format: 'password' },
        code: { type: 'string', minLength: 6, maxLength: 6 },
      },
    },
  })
  @ApiOkResponse({ description: 'MFA disabled.' })
  disableMfa(@Body() body: any) {
    return { mfaEnabled: false };
  }
}
