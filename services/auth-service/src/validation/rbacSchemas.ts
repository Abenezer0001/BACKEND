import * as z from 'zod';

const mongoIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ID format');

export const rbacValidation = {
  // Role-User operations
  assignRole: z.object({
    params: z.object({
      userId: mongoIdSchema,
      roleId: mongoIdSchema
    })
  }),

  removeRole: z.object({
    params: z.object({
      userId: mongoIdSchema,
      roleId: mongoIdSchema
    })
  }),

  // Permission operations
  getUserPermissions: z.object({
    params: z.object({
      userId: mongoIdSchema
    })
  }),

  assignPermission: z.object({
    params: z.object({
      userId: mongoIdSchema,
      permissionId: mongoIdSchema
    })
  }),

  removePermission: z.object({
    params: z.object({
      userId: mongoIdSchema,
      permissionId: mongoIdSchema
    })
  }),

  // Role management
  createRole: z.object({
    body: z.object({
      name: z.string().min(2, 'Role name must be at least 2 characters'),
      description: z.string().min(5, 'Description must be at least 5 characters'),
      permissions: z.array(mongoIdSchema).optional()
    })
  }),

  updateRole: z.object({
    params: z.object({
      roleId: mongoIdSchema
    }),
    body: z.object({
      name: z.string().min(2, 'Role name must be at least 2 characters').optional(),
      description: z.string().min(5, 'Description must be at least 5 characters').optional(),
      permissions: z.array(mongoIdSchema).optional()
    }).refine(data => Object.keys(data).length > 0, {
      message: 'At least one field must be provided for update'
    })
  })
};

