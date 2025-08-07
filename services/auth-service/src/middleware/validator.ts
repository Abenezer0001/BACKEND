import { Request, Response, NextFunction } from 'express';
import { ValidationError } from '../errors/AppError';
import * as z from 'zod';

export const validateRequest = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validationInput = {
        body: req.body,
        query: req.query,
        params: req.params
      };
      
      // Log what we're trying to validate for debugging
      console.log('Validation input:', JSON.stringify(validationInput, null, 2));
      console.log('Request body specifically:', JSON.stringify(req.body, null, 2));
      
      schema.parse(validationInput);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error('Zod validation errors:', JSON.stringify(error.errors, null, 2));
        throw new ValidationError('Invalid request data', {
          errors: error.errors.map(e => ({
            path: e.path.join('.'),
            message: e.message
          }))
        });
      }
      next(error);
    }
  };
};

// Example validation schema
export const createAdminSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    firstName: z.string().min(2, 'First name must be at least 2 characters'),
    lastName: z.string().min(2, 'Last name must be at least 2 characters')
  })
});

