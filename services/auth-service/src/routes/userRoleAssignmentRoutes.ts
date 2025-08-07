import { Router, Request, Response, NextFunction } from 'express';
import UserRoleAssignmentController from '../controllers/UserRoleAssignmentController';
import { authenticateJWT } from '../middleware/auth';
import { requireRole } from '../middleware/rbacMiddleware';

const router = Router();
const userRoleController = new UserRoleAssignmentController();

// Wrapper functions to handle controller method types
const wrapController = (controllerMethod: any) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = controllerMethod(req, res);
      if (result && typeof result.catch === 'function') {
        result.catch(next);
      }
    } catch (error) {
      next(error);
    }
  };
};

// Apply authentication middleware to all routes
router.use(authenticateJWT);

// Role assignment endpoints (Business Owners and SuperAdmins)
router.post(
  '/users/:userId/assign-role',
  authenticateJWT,
  requireRole(['system_admin', 'restaurant_admin']),
  wrapController(userRoleController.assignRoleToUser.bind(userRoleController))
);

router.post(
  '/users/:userId/revoke-role',
  authenticateJWT,
  requireRole(['system_admin', 'restaurant_admin']),
  wrapController(userRoleController.revokeRoleFromUser.bind(userRoleController))
);

// Business user management
router.get(
  '/users/business-users',
  authenticateJWT,
  requireRole(['system_admin', 'restaurant_admin']),
  wrapController(userRoleController.getBusinessUsers.bind(userRoleController))
);

router.post(
  '/users/create-business-user',
  authenticateJWT,
  requireRole(['system_admin', 'restaurant_admin']),
  wrapController(userRoleController.createBusinessUser.bind(userRoleController))
);

export default router; 