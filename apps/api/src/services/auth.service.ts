import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../config/database';
import { redis } from '../config/redis';
import { env } from '../config/env';
import { ApiError } from '../utils/ApiError';
import { SignupInput, LoginInput } from '../validators/auth.validator';
import { currencyService } from './currency.service';

export const authService = {
  async signup(input: SignupInput) {
    const { name, email, password, companyName, country } = input;

    // Detect currency from country
    let currency = 'USD';
    try {
      const currencies = await currencyService.getCountryCurrencies();
      const match = currencies.find(
        (c) => c.country.toLowerCase() === country.toLowerCase()
      );
      if (match) currency = match.code;
    } catch {
      currency = 'USD';
    }

    const hashed = await bcrypt.hash(password, 12);

    const company = await prisma.company.create({
      data: { name: companyName, country, currency },
    });

    const user = await prisma.user.create({
      data: {
        companyId: company.id,
        email,
        password: hashed,
        name,
        role: 'ADMIN',
      },
    });

    const tokens = authService.generateTokens(user);
    await authService.storeRefreshToken(user.id, tokens.refreshToken);

    return { user: authService.sanitizeUser(user), company, ...tokens };
  },

  async login(input: LoginInput) {
    const user = await prisma.user.findUnique({ where: { email: input.email }, include: { company: true } });
    if (!user || !user.isActive) throw new ApiError(401, 'Invalid credentials');

    const valid = await bcrypt.compare(input.password, user.password);
    if (!valid) throw new ApiError(401, 'Invalid credentials');

    const tokens = authService.generateTokens(user);
    await authService.storeRefreshToken(user.id, tokens.refreshToken);

    return { user: authService.sanitizeUser(user), company: user.company, ...tokens };
  },

  async logout(jti: string, userId: string) {
    await redis.set(`blacklist:${jti}`, '1', 'EX', 15 * 60);
    await redis.del(`refresh:${userId}`);
  },

  async refresh(refreshToken: string) {
    let decoded: any;
    try {
      decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as any;
    } catch {
      throw new ApiError(401, 'Invalid refresh token');
    }

    const stored = await redis.get(`refresh:${decoded.id}`);
    if (!stored || stored !== refreshToken) throw new ApiError(401, 'Refresh token expired or revoked');

    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user || !user.isActive) throw new ApiError(401, 'User not found');

    const tokens = authService.generateTokens(user);
    await authService.storeRefreshToken(user.id, tokens.refreshToken);
    return tokens;
  },

  generateTokens(user: { id: string; email: string; name: string; role: string; companyId: string }) {
    const jti = uuidv4();
    const payload = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      companyId: user.companyId,
      jti,
    };

    const accessToken = jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN,
    } as SignOptions);

    const refreshToken = jwt.sign(
      { id: user.id },
      env.JWT_REFRESH_SECRET,
      { expiresIn: env.JWT_REFRESH_EXPIRES_IN } as SignOptions
    );

    return { accessToken, refreshToken };
  },

  async storeRefreshToken(userId: string, token: string) {
    await redis.set(`refresh:${userId}`, token, 'EX', 7 * 24 * 60 * 60);
  },

  sanitizeUser(user: any) {
    const { password, ...safe } = user;
    return safe;
  },
};
