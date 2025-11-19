import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CognitoIdentityProviderClient,
  SignUpCommand,
  InitiateAuthCommand,
  ConfirmSignUpCommand,
  GetUserCommand,
  AdminInitiateAuthCommand,
  AuthFlowType,
} from '@aws-sdk/client-cognito-identity-provider';
import { PrismaService } from '../../prisma/prisma.service';
import { User } from '@prisma/client';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  private cognitoClient: CognitoIdentityProviderClient;
  private userPoolId: string;
  private clientId: string;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService
  ) {
    const region = this.configService.get<string>('AWS_COGNITO_REGION');
    this.userPoolId = this.configService.get<string>(
      'AWS_COGNITO_USER_POOL_ID'
    );
    this.clientId = this.configService.get<string>('AWS_COGNITO_CLIENT_ID');

    this.cognitoClient = new CognitoIdentityProviderClient({
      region,
      credentials: {
        accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID'),
        secretAccessKey: this.configService.get<string>(
          'AWS_SECRET_ACCESS_KEY'
        ),
      },
    });
  }

  async register(registerDto: RegisterDto) {
    const { email, password, firstName, lastName } = registerDto;

    try {
      // Check if user exists in our database
      const existingUser = await this.prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        throw new ConflictException('User already exists');
      }

      // Register user in Cognito
      const signUpCommand = new SignUpCommand({
        ClientId: this.clientId,
        Username: email,
        Password: password,
        UserAttributes: [
          { Name: 'email', Value: email },
          { Name: 'given_name', Value: firstName },
          { Name: 'family_name', Value: lastName },
        ],
      });

      const signUpResponse = await this.cognitoClient.send(signUpCommand);

      // Create user in our database
      const user = await this.prisma.user.create({
        data: {
          email,
          cognitoSub: signUpResponse.UserSub,
          firstName,
          lastName,
          password: null, // Cognito manages passwords
        },
      });

      return {
        user: this.sanitizeUser(user),
        message:
          'User registered successfully. Please check your email to verify your account.',
        userConfirmed: signUpResponse.UserConfirmed,
      };
    } catch (error) {
      if (error.name === 'UsernameExistsException') {
        throw new ConflictException('User already exists in Cognito');
      }
      if (error.name === 'InvalidPasswordException') {
        throw new UnauthorizedException('Password does not meet requirements');
      }
      throw error;
    }
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    try {
      // Authenticate with Cognito
      const authCommand = new InitiateAuthCommand({
        AuthFlow: AuthFlowType.USER_PASSWORD_AUTH,
        ClientId: this.clientId,
        AuthParameters: {
          USERNAME: email,
          PASSWORD: password,
        },
      });

      const authResponse = await this.cognitoClient.send(authCommand);

      if (!authResponse.AuthenticationResult) {
        throw new UnauthorizedException('Authentication failed');
      }

      // Get user details from Cognito
      const getUserCommand = new GetUserCommand({
        AccessToken: authResponse.AuthenticationResult.AccessToken,
      });

      const cognitoUser = await this.cognitoClient.send(getUserCommand);

      // Find or create user in our database
      const cognitoSub = cognitoUser.UserAttributes.find(
        (attr) => attr.Name === 'sub'
      )?.Value;

      let user = await this.prisma.user.findUnique({
        where: { cognitoSub },
      });

      if (!user) {
        // Create user if doesn't exist (edge case)
        const firstName =
          cognitoUser.UserAttributes.find((attr) => attr.Name === 'given_name')
            ?.Value || 'User';
        const lastName =
          cognitoUser.UserAttributes.find((attr) => attr.Name === 'family_name')
            ?.Value || '';

        user = await this.prisma.user.create({
          data: {
            email,
            cognitoSub,
            firstName,
            lastName,
            password: null,
          },
        });
      }

      if (!user.isActive) {
        throw new UnauthorizedException('User account is inactive');
      }

      return {
        user: this.sanitizeUser(user),
        accessToken: authResponse.AuthenticationResult.AccessToken,
        idToken: authResponse.AuthenticationResult.IdToken,
        refreshToken: authResponse.AuthenticationResult.RefreshToken,
        expiresIn: authResponse.AuthenticationResult.ExpiresIn,
      };
    } catch (error) {
      if (error.name === 'NotAuthorizedException') {
        throw new UnauthorizedException('Invalid credentials');
      }
      if (error.name === 'UserNotFoundException') {
        throw new UnauthorizedException('Invalid credentials');
      }
      if (error.name === 'UserNotConfirmedException') {
        throw new UnauthorizedException(
          'Please verify your email before logging in'
        );
      }
      throw error;
    }
  }

  async confirmSignUp(email: string, code: string) {
    try {
      const confirmCommand = new ConfirmSignUpCommand({
        ClientId: this.clientId,
        Username: email,
        ConfirmationCode: code,
      });

      await this.cognitoClient.send(confirmCommand);

      return {
        message: 'Email verified successfully. You can now log in.',
      };
    } catch (error) {
      if (error.name === 'CodeMismatchException') {
        throw new UnauthorizedException('Invalid verification code');
      }
      if (error.name === 'ExpiredCodeException') {
        throw new UnauthorizedException('Verification code has expired');
      }
      throw error;
    }
  }

  async refreshToken(refreshToken: string) {
    try {
      const authCommand = new InitiateAuthCommand({
        AuthFlow: AuthFlowType.REFRESH_TOKEN_AUTH,
        ClientId: this.clientId,
        AuthParameters: {
          REFRESH_TOKEN: refreshToken,
        },
      });

      const authResponse = await this.cognitoClient.send(authCommand);

      if (!authResponse.AuthenticationResult) {
        throw new UnauthorizedException('Token refresh failed');
      }

      return {
        accessToken: authResponse.AuthenticationResult.AccessToken,
        idToken: authResponse.AuthenticationResult.IdToken,
        expiresIn: authResponse.AuthenticationResult.ExpiresIn,
      };
    } catch (error) {
      if (error.name === 'NotAuthorizedException') {
        throw new UnauthorizedException('Invalid refresh token');
      }
      throw error;
    }
  }

  private sanitizeUser(user: User) {
    const { password, ...result } = user;
    return result;
  }
}
