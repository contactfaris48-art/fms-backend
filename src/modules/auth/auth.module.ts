import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { OidcAuthController } from './oidc-auth.controller';
import { PasswordlessAuthController } from './passwordless-auth.controller';
import { CognitoStrategy } from './strategies/cognito.strategy';
import { OidcService } from './services/oidc.service';
import { PasswordlessService } from './services/passwordless.service';
import { EmailService } from './services/email.service';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [PassportModule, ConfigModule, UsersModule],
  controllers: [AuthController, OidcAuthController, PasswordlessAuthController],
  providers: [
    AuthService,
    CognitoStrategy,
    OidcService,
    PasswordlessService,
    EmailService,
  ],
  exports: [AuthService, OidcService, PasswordlessService],
})
export class AuthModule {}
