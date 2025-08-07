import { Request, Response, NextFunction } from 'express';
import User, { IUser, UserRole } from '../models/user.model';
import { Role } from '../models/Role';

export const requireSysAdmin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Get user ID from the authenticated request
    // Use type assertion to handle the JWT payload structure
    const tokenUser = req.user as { id?: string; userId?: string; email?: string; role?: string };
    // Check both id and userId fields since different middleware might use different field names
    const userId = tokenUser?.userId || tokenUser?.id;
    
    console.log('[SysAdmin Auth] User from token:', tokenUser);

    if (!userId) {
      console.log('[SysAdmin Auth] No user ID in token');
      const error = new Error('Authentication required');
      (error as any).statusCode = 401;
      return next(error);
    }

    // Check if the token itself claims the user is a system admin
    if (tokenUser.role === UserRole.SYSTEM_ADMIN) {
      console.log('Auth check - Token indicates user is system admin via role:', tokenUser.role);
      next();
      return;
    }

    try {
      // Find user and populate roles more efficiently with lean()
      const user = await User.findById(userId).populate('roles').lean();
      
      if (!user) {
        console.log('[SysAdmin Auth] User not found in database:', userId);
        const error = new Error('User not found');
        (error as any).statusCode = 401;
        return next(error);
      }
      
      console.log('Auth check - User from DB:', {
        id: user._id,
        email: user.email,
        role: user.role,
        roles: user.roles?.map(r => r.name || r) || []
      });
      
      // Check through all possible ways a user can be a system admin
      
      // 1. Direct role check on the user object
      if (user.role === UserRole.SYSTEM_ADMIN) {
        console.log('Auth check - User is system admin via role field:', user.role);
        next();
        return;
      }

      // 2. Check if user has any role with name 'sys-admin' or 'system_admin'
      if (user.roles && Array.isArray(user.roles)) {
        const hasSysAdminRole = user.roles.some(role => 
          role.name === 'sys-admin' || role.name === 'system_admin'
        );
        
        if (hasSysAdminRole) {
          console.log('Auth check - User has system admin role in roles array');
          next();
          return;
        }

        // 3. As a fallback, check by role ID if names aren't available
        try {
          const sysAdminRole = await Role.findOne({ 
            name: { $in: ['sys-admin', 'system_admin'] } 
          }).lean();

          if (sysAdminRole) {
            const isSysAdmin = user.roles.some(role => 
              role._id.toString() === sysAdminRole._id.toString()
            );

            console.log('Auth check - SysAdmin role check by ID:', {
              roleId: sysAdminRole._id,
              isSysAdmin
            });

            if (isSysAdmin) {
              console.log('Auth check - User is system admin via role ID match');
              next();
              return;
            }
          } else {
            console.log('Auth check - No system admin role found in database');
          }
        } catch (roleError) {
          console.error('Auth check - Error finding system admin role:', roleError);
        }
      }
      
      // If we get here, user is not a system admin
      console.log('[SysAdmin Auth] User does not have system admin privileges');
      const forbiddenError = new Error('System admin role required');
      (forbiddenError as any).statusCode = 403;
      return next(forbiddenError);
      
    } catch (dbError) {
      console.error('[SysAdmin Auth] Error finding user:', dbError);
      const dbError2 = new Error('Database error while validating system admin role');
      (dbError2 as any).statusCode = 500;
      return next(dbError2);
    }
  } catch (error) {
    console.error('[SysAdmin Auth] Unexpected error in system admin authentication:', error);
    (error as any).statusCode = 500;
    return next(error);
  }
};

