import * as z from 'zod';

// Common fields
const emailSchema = z.string().email('Invalid email address');
const nameSchema = z.string().min(2, 'Must be at least 2 characters');
const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/,
    'Password must include uppercase, lowercase, number and special character'
  );

export const adminValidation = {
  // Create first sys-admin
  setupFirstSysAdmin: z.object({
    body: z.object({
      email: emailSchema,
      firstName: nameSchema,
      lastName: nameSchema
    })
  }),

  // Create admin user
  createAdmin: z.object({
    body: z.object({
      email: emailSchema,
      firstName: nameSchema,
      lastName: nameSchema
    })
  }),

  // Verify setup token
  verifyToken: z.object({
    query: z.object({
      token: z.string().min(1, 'Token is required')
    })
  }),

  // Setup password
  setupPassword: z.object({
    body: z.object({
      token: z.string().min(1, 'Token is required'),
      password: passwordSchema
    })
  }),

  // Login
  login: z.object({
    body: z.object({
      email: emailSchema,
      password: z.string().min(1, 'Password is required')
    })
  }),

  // Update admin
  updateAdmin: z.object({
    params: z.object({
      id: z.string().min(1, 'Admin ID is required')
    }),
    body: z.object({
      firstName: nameSchema.optional(),
      lastName: nameSchema.optional(),
      email: emailSchema.optional()
    }).refine(data => Object.keys(data).length > 0, {
      message: 'At least one field must be provided for update'
    })
  }),

  // List admins query parameters
  listAdmins: z.object({
    query: z.object({
      page: z.string().regex(/^\d+$/, 'Page must be a number').optional(),
      limit: z.string().regex(/^\d+$/, 'Limit must be a number').optional(),
      sort: z.enum(['email', 'firstName', 'lastName', 'createdAt']).optional(),
      order: z.enum(['asc', 'desc']).optional()
    })
  })
};

