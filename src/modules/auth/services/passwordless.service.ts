import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { EmailService } from './email.service';
import * as crypto from 'crypto';

@Injectable()
export class PasswordlessService {
  private readonly OTP_LENGTH = 6;
  private readonly OTP_EXPIRY_MINUTES = 10;
  private readonly MAGIC_LINK_EXPIRY_HOURS = 1;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private emailService: EmailService
  ) {}

  /**
   * Generate a random 6-digit OTP
   */
  private generateOTP(): string {
    return crypto.randomInt(100000, 999999).toString();
  }

  /**
   * Generate a secure random token for magic link
   */
  private generateMagicToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Send OTP via email for authentication
   */
  async sendOTP(email: string): Promise<{ message: string }> {
    // Find or create user
    let user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Auto-create user for passwordless auth
      const [firstName, ...lastNameParts] = email.split('@')[0].split('.');
      user = await this.prisma.user.create({
        data: {
          email,
          firstName: firstName || 'User',
          lastName: lastNameParts.join(' ') || 'Name',
          password: null, // Passwordless user
        },
      });
    }

    // Invalidate any existing OTPs
    await this.prisma.authToken.updateMany({
      where: {
        userId: user.id,
        type: 'OTP',
        isUsed: false,
      },
      data: {
        isUsed: true,
      },
    });

    // Generate and store new OTP
    const otp = this.generateOTP();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + this.OTP_EXPIRY_MINUTES);

    await this.prisma.authToken.create({
      data: {
        userId: user.id,
        type: 'OTP',
        token: otp,
        expiresAt,
      },
    });

    // Send email with OTP
    try {
      await this.emailService.sendOTP(email, otp, this.OTP_EXPIRY_MINUTES);
    } catch (error) {
      // Log OTP if email fails (for development)
      console.log(
        `📧 OTP for ${email}: ${otp} (expires in ${this.OTP_EXPIRY_MINUTES} minutes)`
      );
    }

    return {
      message: 'OTP sent to your email',
    };
  }

  /**
   * Verify OTP and authenticate user
   */
  async verifyOTP(
    email: string,
    otp: string
  ): Promise<{ user: any; token: string }> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Find valid OTP
    const authToken = await this.prisma.authToken.findFirst({
      where: {
        userId: user.id,
        type: 'OTP',
        token: otp,
        isUsed: false,
        expiresAt: {
          gte: new Date(),
        },
      },
    });

    if (!authToken) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }

    // Mark OTP as used
    await this.prisma.authToken.update({
      where: { id: authToken.id },
      data: { isUsed: true },
    });

    // Generate session token
    const sessionToken = this.generateMagicToken();

    // Clean up user object
    const { password, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      token: sessionToken,
    };
  }

  /**
   * Send magic link via email for authentication
   */
  async sendMagicLink(email: string): Promise<{ message: string }> {
    // Find or create user
    let user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Auto-create user for passwordless auth
      const [firstName, ...lastNameParts] = email.split('@')[0].split('.');
      user = await this.prisma.user.create({
        data: {
          email,
          firstName: firstName || 'User',
          lastName: lastNameParts.join(' ') || 'Name',
          password: null, // Passwordless user
        },
      });
    }

    // Invalidate any existing magic links
    await this.prisma.authToken.updateMany({
      where: {
        userId: user.id,
        type: 'MAGIC_LINK',
        isUsed: false,
      },
      data: {
        isUsed: true,
      },
    });

    // Generate and store new magic link token
    const token = this.generateMagicToken();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + this.MAGIC_LINK_EXPIRY_HOURS);

    await this.prisma.authToken.create({
      data: {
        userId: user.id,
        type: 'MAGIC_LINK',
        token,
        expiresAt,
      },
    });

    // Generate magic link URL
    const baseUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    const magicLink = `${baseUrl}/api/auth/passwordless/verify-magic-link?token=${token}`;

    // Send email with magic link
    try {
      await this.emailService.sendMagicLink(
        email,
        magicLink,
        this.MAGIC_LINK_EXPIRY_HOURS
      );
    } catch (error) {
      // Log magic link if email fails (for development)
      console.log(`🔗 Magic link for ${email}: ${magicLink}`);
      console.log(`   (expires in ${this.MAGIC_LINK_EXPIRY_HOURS} hour)`);
    }

    return {
      message: 'Magic link sent to your email',
    };
  }

  /**
   * Verify magic link and authenticate user
   */
  async verifyMagicLink(
    token: string
  ): Promise<{ user: any; sessionToken: string }> {
    // Find valid magic link token
    const authToken = await this.prisma.authToken.findFirst({
      where: {
        token,
        type: 'MAGIC_LINK',
        isUsed: false,
        expiresAt: {
          gte: new Date(),
        },
      },
      include: {
        user: true,
      },
    });

    if (!authToken) {
      throw new UnauthorizedException('Invalid or expired magic link');
    }

    // Mark token as used
    await this.prisma.authToken.update({
      where: { id: authToken.id },
      data: { isUsed: true },
    });

    // Generate session token
    const sessionToken = this.generateMagicToken();

    // Clean up user object
    const { password, ...userWithoutPassword } = authToken.user;

    return {
      user: userWithoutPassword,
      sessionToken,
    };
  }

  /**
   * Clean up expired tokens (should be run periodically)
   */
  async cleanupExpiredTokens(): Promise<number> {
    const result = await this.prisma.authToken.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    return result.count;
  }
}
