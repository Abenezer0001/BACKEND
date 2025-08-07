import { Express } from 'express-serve-static-core';
import multer from 'multer';

declare global {
  namespace Express {
    interface Request {
      file?: multer.File;
      files?: Record<string, multer.File[]> | multer.File[];
    }
    namespace Multer {
      interface File extends multer.File {}
    }
  }
}

// This file doesn't have any exports
export {}; 