import { RequestHandler } from 'express';
import { ApiError } from '../utils/ApiError';

export const asyncHandler =
  (fn: RequestHandler): RequestHandler =>
  (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);
