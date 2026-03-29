import { Request, Response, NextFunction } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { env } from '../config/env';
import { redis } from '../config/redis';
import { ApiError } from '../utils/ApiError';
import { Role } from '@prisma/client';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  companyId: string;
  jti: string;
}

declare global {
  namespace Express {
    interface Request {
      user: AuthUser;
    }
  }
}

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.cookies?.accessToken || req.headers.authorization?.replace('Bearer ', '');
    if (!token) throw new ApiError(401, 'Authentication required');

    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload & AuthUser;

    // Check JWT blacklist
    const isBlacklisted = await redis.get(`blacklist:${decoded.jti}`);
    if (isBlacklisted) throw new ApiError(401, 'Token has been revoked');

    req.user = {
      id: decoded.id,
      email: decoded.email,
      name: decoded.name,
      role: decoded.role,
      companyId: decoded.companyId,
      jti: decoded.jti,
    };

    next();
  } catch (err) {
    if (err instanceof ApiError) return next(err);
    if (err instanceof jwt.TokenExpiredError) return next(new ApiError(401, 'Token expired'));
    if (err instanceof jwt.JsonWebTokenError) return next(new ApiError(401, 'Invalid token'));
    next(err);
  }
};
