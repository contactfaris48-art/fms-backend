import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-custom';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';
import { CognitoJwtVerifier } from 'aws-jwt-verify';
import { Request } from 'express';

@Injectable()
export class CognitoStrategy extends PassportStrategy(Strategy, 'cognito') {
  private verifier: any;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService
  ) {
    super();

    // Initialize Cognito JWT Verifier
    this.verifier = CognitoJwtVerifier.create({
      userPoolId: this.configService.get<string>('AWS_COGNITO_USER_POOL_ID'),
      tokenUse: 'access',
      clientId: this.configService.get<string>('AWS_COGNITO_CLIENT_ID'),
    });
  }

  async validate(req: Request): Promise<any> {
    try {
      // Extract token from Authorization header
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new UnauthorizedException('No token provided');
      }

      const token = authHeader.substring(7);

      // Verify the token with Cognito
      const payload = await this.verifier.verify(token);

      // Extract user information from the token
      const cognitoSub = payload.sub;
      const email = payload.email || payload.username;

      if (!cognitoSub) {
        throw new UnauthorizedException('Invalid token payload');
      }

      // Find or create user in database
      let user = await this.prisma.user.findUnique({
        where: { cognitoSub },
      });

      if (!user) {
        // If user doesn't exist by cognitoSub, check by email
        user = await this.prisma.user.findUnique({
          where: { email },
        });

        if (user) {
          // Update existing user with Cognito sub
          user = await this.prisma.user.update({
            where: { id: user.id },
            data: { cognitoSub },
          });
        } else {
          // Create new user from Cognito data
          user = await this.prisma.user.create({
            data: {
              email,
              cognitoSub,
              firstName: payload.given_name || payload.name || 'User',
              lastName: payload.family_name || '',
              password: null, // Cognito users don't have local passwords
            },
          });
        }
      }

      if (!user.isActive) {
        throw new UnauthorizedException('User account is inactive');
      }

      return user;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
