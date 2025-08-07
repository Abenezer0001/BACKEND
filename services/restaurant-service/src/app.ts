import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import path from 'path';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import dotenv from 'dotenv';

// Import routes
import restaurantRoutes from './routes/restaurant.routes';
import venueRoutes from './routes/venue.routes';
import tableRoutes from './routes/table.routes';
import tableTypeRoutes from './routes/tableType.routes';
import zoneRoutes from './routes/zone.routes';
import menuRoutes from './routes/menu.routes';
import categoryRoutes from './routes/category.routes';
import subCategoryRoutes from './routes/subCategory.routes';
import subSubCategoryRoutes from './routes/subSubCategory.routes';
import menuItemRoutes from './routes/menuItem.routes';
import modifierRoutes from './routes/modifier.routes';
import businessRoutes from './routes/business.routes';
import promotionRoutes from './routes/promotion.routes';
import adminPromotionRoutes from './routes/adminPromotion.routes';
import debugPromotionRoutes from './routes/debugPromotions.routes';
import scheduleRoutes from './routes/scheduleRoutes';
import publicMenuRoutes from './routes/publicMenu.routes';
import waiterCallRoutes from './routes/waiterCall.routes';
import cashPaymentRoutes from './routes/cashPayment.routes';

// Load environment variables
dotenv.config();

// Create Express app
export const app = express();

// Middleware
const corsOrigins = process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:3001,http://localhost:5173,http://localhost:8080,https://cms.inseat.achievengine.com,https://menu.inseat.achievengine.com,*';
const originsArray = corsOrigins.split(',');
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, etc)
    if (!origin) return callback(null, true);
    
    // Check if origin is in the allowed list or if wildcard is enabled
    if (originsArray.includes(origin) || originsArray.includes('*')) {
      callback(null, true);
    } else {
      console.log(`CORS blocked request from origin: ${origin}`);
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With', 
    'Content-Type',
    'Accept',
    'Authorization',
    'Cache-Control',
    'cache-control',
    'X-CSRF-Token',
    'X-Auth-Token'
  ],
  exposedHeaders: ['Content-Length', 'Content-Type', 'Set-Cookie']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Connect to MongoDB
const mongoUri = process.env.MONGO_URI  || "mongodb+srv://abenezer:YXVC8lBaPIcb2o3s@cluster0.oljifwd.mongodb.net/inseat?retryWrites=true&w=majority&appName=Cluster0";
console.log(`Connecting to MongoDB with URI: ${mongoUri.substring(0, mongoUri.indexOf('@') + 1)}[REDACTED]`);
mongoose.connect(mongoUri)
  .then(() => console.log('Connected to MongoDB Atlas'))
  .catch(err => console.error('MongoDB connection error:', err));

// Debugging for route file discovery
const routePaths = [
  path.join(__dirname, 'routes/*.routes.js'),
  path.join(__dirname, 'routes/*.routes.ts'),
  path.join(__dirname, '../src/routes/*.routes.js'),
  path.join(__dirname, '../src/routes/*.routes.ts'),
];

console.log('Looking for API route files in:');
routePaths.forEach(routePath => console.log(` - ${routePath}`));

// Swagger definition
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'INSEAT Restaurant Service API',
      version: '1.0.0',
      description: 'API documentation for the INSEAT Restaurant Service',
    },
    servers: [
      {
        url: 'http://localhost:3001',
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      responses: {
        UnauthorizedError: {
          description: 'Access token is missing or invalid',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  message: {
                    type: 'string',
                    example: 'Unauthorized',
                  },
                },
              },
            },
          },
        },
        ForbiddenError: {
          description: 'Forbidden access to the requested resource',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  message: {
                    type: 'string',
                    example: 'Forbidden',
                  },
                },
              },
            },
          },
        },
        NotFoundError: {
          description: 'The requested resource was not found',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  message: {
                    type: 'string',
                    example: 'Resource not found',
                  },
                },
              },
            },
          },
        },
        BadRequestError: {
          description: 'Invalid request parameters',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  message: {
                    type: 'string',
                    example: 'Invalid request parameters',
                  },
                },
              },
            },
          },
        },
        ServerError: {
          description: 'Internal server error',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  message: {
                    type: 'string',
                    example: 'Internal server error',
                  },
                },
              },
            },
          },
        },
      },
      schemas: {
        MenuItem: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              example: '60d21b4667d0d8992e610c85',
            },
            name: {
              type: 'string',
              example: 'Margherita Pizza',
            },
            description: {
              type: 'string',
              example: 'Fresh tomatoes, mozzarella, and basil',
            },
            price: {
              type: 'number',
              example: 12.99,
            },
            image: {
              type: 'string',
              example: 'https://example.com/images/margherita.jpg',
            },
            categoryId: {
              type: 'string',
              example: '60d21b4667d0d8992e610c84',
            },
            modifiers: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: {
                    type: 'string',
                    example: 'Size',
                  },
                  options: {
                    type: 'array',
                    items: {
                      type: 'string',
                    },
                    example: ['Small', 'Medium', 'Large'],
                  },
                  price: {
                    type: 'number',
                    example: 2.00,
                  },
                },
              },
            },
            isAvailable: {
              type: 'boolean',
              example: true,
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
      },
    },
  },
  apis: routePaths,
  failOnErrors: false, // Don't crash on Swagger validation errors
  swaggerDefinition: {
    openapi: '3.0.0',
  },
};

// Initialize Swagger document with better error handling
let swaggerSpec;
try {
  console.log('Initializing Swagger documentation...');
  swaggerSpec = swaggerJsdoc(swaggerOptions);
  console.log('Swagger documentation initialized successfully');
  
  // Verify if the documentation has routes
  const paths = Object.keys(swaggerSpec.paths || {});
  if (paths.length === 0) {
    console.warn('WARNING: No API routes were found in the Swagger documentation!');
    console.warn('Ensure your route files contain proper JSDoc comments.');
  } else {
    console.log(`Found ${paths.length} API routes in the Swagger documentation:`);
    paths.forEach(path => console.log(` - ${path}`));
  }
} catch (error) {
  console.error('Failed to initialize Swagger documentation:', error);
  // Create a minimal spec if it fails
  swaggerSpec = {
    openapi: '3.0.0',
    info: {
      title: 'INSEAT Restaurant Service API',
      version: '1.0.0',
      description: 'API documentation error - check server logs',
    },
    paths: {},
  };
}

// Debug middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log('Request:', {
    method: req.method,
    url: req.url,
    body: req.body,
    params: req.params,
  });
  next();
});

// Swagger JSON endpoint for debugging
app.get('/api-docs.json', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// Route to check if route files are being discovered
app.get('/api/debug/routes', (req: Request, res: Response) => {
  // Scan for route files
  const fs = require('fs');
  const glob = require('glob');
  
  const routeFiles: { pattern: string, files: string[] }[] = [];
  
  // Find files matching each pattern
  routePaths.forEach(pattern => {
    try {
      const files = glob.sync(pattern);
      routeFiles.push({ pattern, files });
    } catch (error) {
      routeFiles.push({ pattern, files: [`Error: ${error.message}`] });
    }
  });
  
  // Return debug information
  res.json({
    routePatterns: routePaths,
    discoveredFiles: routeFiles,
    swaggerPaths: Object.keys(swaggerSpec.paths || {}),
    environment: {
      nodeEnv: process.env.NODE_ENV,
      dirname: __dirname,
      cwd: process.cwd(),
    }
  });
});

// Basic auth middleware for Swagger UI in production
const swaggerUiSetup = () => {
  // If in production and SWAGGER_USER and SWAGGER_PASSWORD are set, use basic auth
  if (process.env.NODE_ENV === 'production' && 
      process.env.SWAGGER_USER && 
      process.env.SWAGGER_PASSWORD) {
    
    const credentials = {
      users: { 
        [process.env.SWAGGER_USER]: process.env.SWAGGER_PASSWORD 
      },
      challenge: true,
    };
    
    return swaggerUi.setup(swaggerSpec, {
      explorer: true,
      customCss: '.swagger-ui .topbar { display: none }',
      swaggerOptions: {
        docExpansion: 'none',
        filter: true,
        showRequestDuration: true,
      },
    }, null, null, credentials);
  }
  
  // Default setup without auth
  return swaggerUi.setup(swaggerSpec, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    swaggerOptions: {
      docExpansion: 'none',
      filter: true,
      showRequestDuration: true,
    },
  });
};

// Swagger UI setup
app.use('/api-docs', swaggerUi.serve, swaggerUiSetup());

// API Routes
app.use('/api/restaurants', restaurantRoutes);
app.use('/api/venues', venueRoutes);
app.use('/api/tables', tableRoutes);
app.use('/api/table-types', tableTypeRoutes);
app.use('/api/zones', zoneRoutes);
app.use('/api/menus', menuRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/sub-categories', subCategoryRoutes);
app.use('/api/sub-sub-categories', subSubCategoryRoutes);
app.use('/api/menu-items', menuItemRoutes);
app.use('/api/modifiers', modifierRoutes);
app.use('/api/business', businessRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/waiter-calls', waiterCallRoutes);
app.use('/api/cash-payments', cashPaymentRoutes);

// Register promotionRoutes under /api/promotions
app.use('/api/promotions', promotionRoutes);

// Register adminPromotionRoutes under /api/admin-promotions (changed from /api/admin/promotions to avoid conflict with auth service)
app.use('/api/admin-promotions', adminPromotionRoutes);

// Debug routes - no middleware, for testing only
app.use('/api/debug/promotions', debugPromotionRoutes);

// Public routes (no authentication required)
app.use('/public/menu', publicMenuRoutes);

// Root path response
app.get('/', (req: Request, res: Response) => {
  res.json({ message: 'Welcome to INSEAT Restaurant Service API' });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ message: 'Not found' });
});

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
  });
});

// Start server
const PORT = process.env.PORT || 3001;

// Only start the server if this file is run directly
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`API Documentation available at http://localhost:${PORT}/api-docs`);
    console.log(`Swagger JSON available at http://localhost:${PORT}/api-docs.json`);
    console.log(`API Route Debug info available at http://localhost:${PORT}/api/debug/routes`);
    
    if (process.env.NODE_ENV === 'development') {
      console.log('Routes:');
      const routes: { path: string; methods: string[] }[] = [];
      
      // Print all registered routes
      app._router.stack.forEach((middleware: any) => {
        if (middleware.route) {
          // Routes registered directly on the app
          const methods = Object.keys(middleware.route.methods)
            .filter(method => middleware.route.methods[method])
            .map(method => method.toUpperCase());
          routes.push({ path: middleware.route.path, methods });
        } else if (middleware.name === 'router') {
          // Routes registered in a router
          middleware.handle.stack.forEach((handler: any) => {
            if (handler.route) {
              const methods = Object.keys(handler.route.methods)
                .filter(method => handler.route.methods[method])
                .map(method => method.toUpperCase());
              routes.push({ 
                path: middleware.regexp.toString().includes('/api/') 
                  ? `${middleware.regexp.toString().split('/api')[1].split('\\')[0]}${handler.route.path}`
                  : handler.route.path,
                methods
              });
            }
          });
        }
      });
      
      // Sort and log routes
      routes
        .sort((a, b) => a.path.localeCompare(b.path))
        .forEach(route => {
          console.log(`${route.methods.join(', ')}\t${route.path}`);
        });
    }
  });
}

export default app;
