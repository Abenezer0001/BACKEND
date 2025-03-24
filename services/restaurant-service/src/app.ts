// import express from 'express';
// import cors from 'cors';
// import mongoose from 'mongoose';
// import restaurantRoutes from './routes/restaurant.routes';
// import venueRoutes from './routes/venue.routes';
// import tableRoutes from './routes/table.routes';
// import menuRoutes from './routes/menu.routes';

// export const app = express();

// app.use(cors());
// app.use(express.json());

// // Connect to MongoDB
// mongoose.connect('mongodb://localhost:27017/inseat')
//   .then(() => console.log('Connected to MongoDB'))
//   .catch(err => console.error('MongoDB connection error:', err));

// // Debug middleware
// app.use((req, res, next) => {
//   console.log('Request:', {
//     method: req.method,
//     url: req.url,
//     body: req.body,
//     params: req.params
//   });
//   next();
// });

// // Routes
// app.use('/api', tableRoutes);
// app.use('/api/restaurants', restaurantRoutes);
// app.use('/api/venues', venueRoutes);
// app.use('/api/menus', menuRoutes);

// // Debug middleware
// app.use((req, res, next) => {
//   console.log('Request:', {
//     method: req.method,
//     url: req.url,
//     body: req.body,
//     params: req.params
//   });
//   next();
// });

// // Error handling middleware
// app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
//   console.error('Error:', err);
//   res.status(err.status || 500).json({
//     error: err.message || 'Internal Server Error'
//   });
// });

// // Start server
// const PORT = process.env.PORT || 5173;
// app.listen(PORT, () => {
//   console.log(`Server is running on port ${PORT}`);
// });

// export default app;
