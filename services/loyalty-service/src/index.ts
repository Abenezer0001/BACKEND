import express from 'express';
import loyaltyRoutes from './routes/loyaltyRoutes';

const app = express();

// Middleware
app.use(express.json());

// Routes
app.use('/api/loyalty', loyaltyRoutes);

export { loyaltyRoutes };
export * from './models/LoyaltyProgram';
export * from './models/CustomerLoyalty';
export * from './services/LoyaltyService';
export * from './controllers/LoyaltyController';