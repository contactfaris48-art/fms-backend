import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SES } from '@aws-sdk/client-ses';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private sesClient: SES;
  private fromEmail: string;

  constructor(private configService: ConfigService) {
    this.sesClient = new SES({
      region: this.configService.get<string>('AWS_REGION'),
      credentials: {
        accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID'),
        secretAccessKey: this.configService.get<string>(
          'AWS_SECRET_ACCESS_KEY'
        ),
      },
    });

    this.fromEmail =
      this.configService.get<string>('EMAIL_FROM') || 'noreply@example.com';
  }

  /**
   * Send OTP email
   */
  async sendOTP(
    email: string,
    otp: string,
    expiryMinutes: number
  ): Promise<void> {
    const subject = 'Your Login Code';
    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .code-box { background: #f4f4f4; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; margin: 30px 0; border-radius: 5px; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>Your Login Code</h2>
          <p>Use the following code to log in to your File Management System account:</p>
          <div class="code-box">${otp}</div>
          <p><strong>This code will expire in ${expiryMinutes} minutes.</strong></p>
          <p>If you didn't request this code, you can safely ignore this email.</p>
          <div class="footer">
            <p>This is an automated message from File Management System. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const textBody = `
      Your Login Code
      
      Use the following code to log in to your File Management System account:
      
      ${otp}
      
      This code will expire in ${expiryMinutes} minutes.
      
      If you didn't request this code, you can safely ignore this email.
    `;

    await this.sendEmail(email, subject, htmlBody, textBody);
  }

  /**
   * Send Magic Link email
   */
  async sendMagicLink(
    email: string,
    magicLink: string,
    expiryHours: number
  ): Promise<void> {
    const subject = 'Your Magic Login Link';
    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .button { display: inline-block; padding: 15px 30px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .link-box { background: #f4f4f4; padding: 15px; margin: 20px 0; word-break: break-all; border-radius: 5px; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>Your Magic Login Link</h2>
          <p>Click the button below to log in to your File Management System account:</p>
          <a href="${magicLink}" class="button">Log In Now</a>
          <p>Or copy and paste this link into your browser:</p>
          <div class="link-box">${magicLink}</div>
          <p><strong>This link will expire in ${expiryHours} hour${expiryHours > 1 ? 's' : ''}.</strong></p>
          <p>If you didn't request this link, you can safely ignore this email.</p>
          <div class="footer">
            <p>This is an automated message from File Management System. Please do not reply to this email.</p>
            <p>For security reasons, never share this link with anyone.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const textBody = `
      Your Magic Login Link
      
      Click the link below to log in to your File Management System account:
      
      ${magicLink}
      
      This link will expire in ${expiryHours} hour${expiryHours > 1 ? 's' : ''}.
      
      If you didn't request this link, you can safely ignore this email.
      
      For security reasons, never share this link with anyone.
    `;

    await this.sendEmail(email, subject, htmlBody, textBody);
  }

  /**
   * Send email using AWS SES
   */
  private async sendEmail(
    to: string,
    subject: string,
    htmlBody: string,
    textBody: string
  ): Promise<void> {
    try {
      const params = {
        Source: this.fromEmail,
        Destination: {
          ToAddresses: [to],
        },
        Message: {
          Subject: {
            Data: subject,
            Charset: 'UTF-8',
          },
          Body: {
            Html: {
              Data: htmlBody,
              Charset: 'UTF-8',
            },
            Text: {
              Data: textBody,
              Charset: 'UTF-8',
            },
          },
        },
      };

      await this.sesClient.sendEmail(params);
      this.logger.log(`Email sent to ${to}: ${subject}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}:`, error);

      // For development: log email content instead of throwing error
      if (this.configService.get('NODE_ENV') === 'development') {
        this.logger.warn('Email sending failed. Email content:');
        this.logger.warn(`To: ${to}`);
        this.logger.warn(`Subject: ${subject}`);
        this.logger.warn(`Body: ${textBody}`);
      } else {
        throw error;
      }
    }
  }
}
