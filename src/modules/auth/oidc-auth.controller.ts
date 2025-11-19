import { Controller, Get, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { OidcService } from './services/oidc.service';
import { CheckAuthMiddleware } from '../../common/middleware/check-auth.middleware';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('oidc-auth')
@Controller('auth/oidc')
export class OidcAuthController {
  constructor(private readonly oidcService: OidcService) {}

  @Get('login')
  @ApiOperation({ summary: 'Redirect to Cognito hosted UI for login' })
  async login(@Req() req: Request, @Res() res: Response) {
    const nonce = this.oidcService.generateNonce();
    const state = this.oidcService.generateState();

    req.session.nonce = nonce;
    req.session.state = state;

    const authUrl = this.oidcService.getAuthorizationUrl(state, nonce);
    res.redirect(authUrl);
  }

  @Get('callback')
  @ApiOperation({
    summary: 'Handle callback from Cognito after authentication',
  })
  async callback(@Req() req: Request, @Res() res: Response) {
    try {
      const params = this.oidcService.callbackParams(req);
      const redirectUri = process.env.COGNITO_REDIRECT_URI;

      const tokenSet = await this.oidcService.callback(redirectUri, params, {
        nonce: req.session.nonce,
        state: req.session.state,
      });

      const userInfo = await this.oidcService.getUserInfo(
        tokenSet.access_token
      );
      req.session.userInfo = userInfo;

      // Redirect to frontend or home page
      const frontendUrl = process.env.FRONTEND_URL || '/';
      res.redirect(frontendUrl);
    } catch (err) {
      console.error('Callback error:', err);
      res.redirect('/auth/oidc/login');
    }
  }

  @Get('logout')
  @ApiOperation({ summary: 'Logout and clear session' })
  async logout(@Req() req: Request, @Res() res: Response) {
    req.session.destroy((err) => {
      if (err) {
        console.error('Session destruction error:', err);
      }
    });

    const logoutUrl = this.oidcService.getLogoutUrl();
    res.redirect(logoutUrl);
  }

  @Get('status')
  @ApiOperation({ summary: 'Check authentication status' })
  async status(@Req() req: Request) {
    return {
      isAuthenticated: !!req.session?.userInfo,
      userInfo: req.session?.userInfo || null,
    };
  }
}
