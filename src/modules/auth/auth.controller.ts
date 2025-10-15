import { Controller, Post, Body, Req, Res } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dtos';
import { Request, Response } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  async login(@Body() dto: LoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const ip = req.ip;
    const ua = req.headers['user-agent'] ?? '';
    const r = await this.auth.login(dto.account, dto.password, ip, ua);

    // set refresh cookie (HttpOnly)
    res.cookie('refresh_token', r.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000,
      path: '/auth/refresh'
    });

    // also set sessionId cookie to identify session (optional)
    res.cookie('session_id', r.sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    // return access token (frontend store in memory or localStorage)
    return { accessToken: r.accessToken, user: r.user, expiresAt: r.expiresAt };
  }

  @Post('refresh')
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const sessionId = req.cookies['session_id'];
    const refresh = req.cookies['refresh_token'];
    const r = await this.auth.refresh(sessionId, refresh);

    // rotate cookie for refresh token
    res.cookie('refresh_token', r.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000,
      path: '/auth/refresh'
    });

    return { accessToken: r.accessToken, expiresAt: r.expiresAt };
  }

  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const sessionId = req.cookies['session_id'];
    await this.auth.logout(sessionId);
    res.clearCookie('session_id');
    res.clearCookie('refresh_token');
    return { ok: true };
  }
}
