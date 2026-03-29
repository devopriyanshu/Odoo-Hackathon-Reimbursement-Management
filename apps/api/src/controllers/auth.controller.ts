import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { authService } from '../services/auth.service';
import { prisma } from '../config/database';
import { env } from '../config/env';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
};

export const authController = {
  signup: asyncHandler(async (req: Request, res: Response) => {
    const { user, company, accessToken, refreshToken } = await authService.signup(req.body);
    res.cookie('accessToken', accessToken, { ...COOKIE_OPTIONS, maxAge: 15 * 60 * 1000 });
    res.cookie('refreshToken', refreshToken, { ...COOKIE_OPTIONS, maxAge: 7 * 24 * 60 * 60 * 1000 });
    res.status(201).json({ success: true, data: { user, company } });
  }),

  login: asyncHandler(async (req: Request, res: Response) => {
    const { user, company, accessToken, refreshToken } = await authService.login(req.body);
    res.cookie('accessToken', accessToken, { ...COOKIE_OPTIONS, maxAge: 15 * 60 * 1000 });
    res.cookie('refreshToken', refreshToken, { ...COOKIE_OPTIONS, maxAge: 7 * 24 * 60 * 60 * 1000 });
    res.json({ success: true, data: { user, company } });
  }),

  logout: asyncHandler(async (req: Request, res: Response) => {
    await authService.logout(req.user.jti, req.user.id);
    res.clearCookie('accessToken', COOKIE_OPTIONS);
    res.clearCookie('refreshToken', COOKIE_OPTIONS);
    res.json({ success: true, message: 'Logged out successfully' });
  }),

  me: asyncHandler(async (req: Request, res: Response) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { company: true },
    });
    const { password, ...safe } = user as any;
    res.json({ success: true, data: safe });
  }),

  refresh: asyncHandler(async (req: Request, res: Response) => {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({ success: false, message: 'No refresh token' });
    }
    const tokens = await authService.refresh(refreshToken);
    res.cookie('accessToken', tokens.accessToken, { ...COOKIE_OPTIONS, maxAge: 15 * 60 * 1000 });
    res.cookie('refreshToken', tokens.refreshToken, { ...COOKIE_OPTIONS, maxAge: 7 * 24 * 60 * 60 * 1000 });
    res.json({ success: true, message: 'Token refreshed' });
  }),
};
