import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ocrService } from '../services/ocr.service';
import { ApiError } from '../utils/ApiError';
import * as path from 'path';

export const ocrController = {
  scan: asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) throw new ApiError(400, 'No file uploaded');
    const result = await ocrService.scan(req.file.path);
    res.json({ success: true, data: result });
  }),
};
