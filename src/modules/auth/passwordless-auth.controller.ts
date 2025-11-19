import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Req,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiQuery } from '@nestjs/swagger';
import { PasswordlessService } from './services/passwordless.service';
import { Request, Response } from 'express';

@ApiTags('passwordless-auth')
@Controller('auth/passwordless')
export class PasswordlessAuthController {
  constructor(private readonly passwordlessService: PasswordlessService) {}

  @Post('send-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send OTP to email for passwordless login' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['email'],
      properties: {
        email: { type: 'string', format: 'email', example: 'user@example.com' },
      },
    },
  })
  async sendOTP(@Body('email') email: string) {
    return this.passwordlessService.sendOTP(email);
  }

  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify OTP and authenticate user' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['email', 'otp'],
      properties: {
        email: { type: 'string', format: 'email', example: 'user@example.com' },
        otp: { type: 'string', example: '123456' },
      },
    },
  })
  async verifyOTP(
    @Body('email') email: string,
    @Body('otp') otp: string,
    @Req() req: Request
  ) {
    const result = await this.passwordlessService.verifyOTP(email, otp);

    // Store user info in session
    req.session.userInfo = result.user;

    return {
      message: 'Authentication successful',
      user: result.user,
    };
  }

  @Post('send-magic-link')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send magic link to email for passwordless login' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['email'],
      properties: {
        email: { type: 'string', format: 'email', example: 'user@example.com' },
      },
    },
  })
  async sendMagicLink(@Body('email') email: string) {
    return this.passwordlessService.sendMagicLink(email);
  }

  @Get('verify-magic-link')
  @ApiOperation({ summary: 'Verify magic link token and authenticate user' })
  @ApiQuery({
    name: 'token',
    required: true,
    type: String,
    example: 'abc123def456...',
  })
  async verifyMagicLink(
    @Query('token') token: string,
    @Req() req: Request,
    @Res() res: Response
  ) {
    try {
      const result = await this.passwordlessService.verifyMagicLink(token);

      // Store user info in session
      req.session.userInfo = result.user;

      // Redirect to frontend
      const frontendUrl = process.env.FRONTEND_URL || '/';
      res.redirect(`${frontendUrl}?auth=success`);
    } catch (error) {
      // Redirect to frontend with error
      const frontendUrl = process.env.FRONTEND_URL || '/';
      res.redirect(
        `${frontendUrl}?auth=failed&error=${encodeURIComponent(error.message)}`
      );
    }
  }

  @Get('status')
  @ApiOperation({ summary: 'Check authentication status' })
  async status(@Req() req: Request) {
    return {
      isAuthenticated: !!req.session?.userInfo,
      user: req.session?.userInfo || null,
    };
  }
}
