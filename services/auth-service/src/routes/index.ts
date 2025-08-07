import express from 'express';
import authRoutes from './authRoutes';
import userRoutes from './userRoleAssignmentRoutes';
import roleRoutes from './roleRoutes';
import permissionRoutes from './permissionRoutes';
import rbacRoutes from './rbacRoutes';
import kitchenRoutes from './kitchenRoutes';
import cashierRoutes from './cashierRoutes';

const router = express.Router();

// Mount the routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/roles', roleRoutes);
router.use('/permissions', permissionRoutes);
router.use('/rbac', rbacRoutes);
router.use('/kitchens', kitchenRoutes);
router.use('/cashiers', cashierRoutes);

export default router; 