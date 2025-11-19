import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as openid from 'openid-client';

@Injectable()
export class OidcService implements OnModuleInit {
  private readonly logger = new Logger(OidcService.name);
  private config: any;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    try {
      await this.initializeClient();
      this.logger.log('✓ OIDC Client initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize OIDC Client', error);
      throw error;
    }
  }

  private async initializeClient() {
    const userPoolId = this.configService.get<string>(
      'AWS_COGNITO_USER_POOL_ID'
    );
    const clientId = this.configService.get<string>('AWS_COGNITO_CLIENT_ID');
    const clientSecret = this.configService.get<string>(
      'AWS_COGNITO_CLIENT_SECRET'
    );
    const region = this.configService.get<string>('AWS_COGNITO_REGION');

    if (!userPoolId || !clientId || !region) {
      throw new Error(
        'Missing required Cognito configuration. Check your .env file.'
      );
    }

    const issuerUrl = `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`;

    this.logger.log(`Discovering OIDC issuer at: ${issuerUrl}`);

    this.config = await openid.discovery(
      new URL(issuerUrl),
      clientId,
      clientSecret
    );
  }

  getClient(): any {
    if (!this.config) {
      throw new Error('OIDC Client not initialized');
    }
    return this.config;
  }

  generateNonce(): string {
    return openid.randomNonce();
  }

  generateState(): string {
    return openid.randomState();
  }

  getAuthorizationUrl(state: string, nonce: string): string {
    const clientId = this.configService.get<string>('AWS_COGNITO_CLIENT_ID');
    const redirectUri = this.configService.get<string>('COGNITO_REDIRECT_URI');
    const domain = this.configService.get<string>('AWS_COGNITO_DOMAIN');

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'phone openid email',
      state: state,
      nonce: nonce,
    });

    return `https://${domain}/oauth2/authorize?${params.toString()}`;
  }

  async callback(
    redirectUri: string,
    params: any,
    checks: { state: string; nonce: string }
  ) {
    const currentUrl = new URL(redirectUri);
    currentUrl.search = new URLSearchParams(params).toString();

    const tokens = await openid.authorizationCodeGrant(
      this.config,
      currentUrl,
      { expectedState: checks.state, expectedNonce: checks.nonce }
    );

    return tokens;
  }

  async getUserInfo(accessToken: string) {
    const userinfo = await openid.fetchUserInfo(
      this.config,
      accessToken,
      this.configService.get('AWS_COGNITO_CLIENT_ID')
    );

    return userinfo;
  }

  callbackParams(req: any) {
    return {
      code: req.query.code,
      state: req.query.state,
    };
  }

  getLogoutUrl(): string {
    const domain = this.configService.get<string>('AWS_COGNITO_DOMAIN');
    const clientId = this.configService.get<string>('AWS_COGNITO_CLIENT_ID');
    const logoutUri = this.configService.get<string>('COGNITO_LOGOUT_URI');

    return `https://${domain}/logout?client_id=${clientId}&logout_uri=${logoutUri}`;
  }
}
