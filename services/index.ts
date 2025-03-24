import { Router } from 'express';
import restaurantRoutes from './restaurant-service/src/routes/restaurant.routes';
import tableRoutes from './restaurant-service/src/routes/table.routes';
import venueRoutes from './restaurant-service/src/routes/venue.routes';
import menuRoutes from './restaurant-service/src/routes/menu.routes';
import zoneRoutes from './restaurant-service/src/routes/zone.routes';
import categoryRoutes from './restaurant-service/src/routes/category.routes';
import modifierRoutes from './restaurant-service/src/routes/modifier.routes';
import orderRoutes from './order-service/src/routes/orderRoutes';
import authRoutes from './auth-service/src/routes/authRoutes';
import roleRoutes from './auth-service/src/routes/roleRoutes';
import permissionRoutes from './auth-service/src/routes/permissionRoutes';

const router = Router();

router.use('/restaurants', restaurantRoutes);
router.use('/tables', tableRoutes);
router.use('/venues', venueRoutes);
router.use('/menus', menuRoutes);
router.use('/zones', zoneRoutes);
router.use('/categories', categoryRoutes);
router.use('/modifiers', modifierRoutes);
router.use('/orders', orderRoutes);
router.use('/auth', authRoutes);
router.use('/auth/roles', roleRoutes);
router.use('/auth/permissions', permissionRoutes);

export default router;
