import swaggerJsdoc from 'swagger-jsdoc';
import { Express, Request, Response } from 'express';
import swaggerUi from 'swagger-ui-express';
import path from 'path';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'INSEAT Restaurant Service API',
      description: 'API documentation for the INSEAT restaurant management system',
      contact: {
        name: 'INSEAT Support',
        email: 'support@inseat.com',
        url: 'https://inseat.com'
      },
      version: '1.0.0',
    },
    servers: [
      {
        url: 'http://localhost:3000/api',
        description: 'Development server'
      }
    ],
    security: [
      {
        bearerAuth: []
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
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
                    example: 'Unauthorized'
                  }
                }
              }
            }
          }
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
                    example: 'Invalid request parameters'
                  },
                  errors: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        field: { type: 'string' },
                        message: { type: 'string' }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        NotFoundError: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  message: {
                    type: 'string',
                    example: 'Resource not found'
                  }
                }
              }
            }
          }
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
                    example: 'Internal server error'
                  }
                }
              }
            }
          }
        }
      },
      schemas: {
        Location: {
          type: 'object',
          properties: {
            address: { type: 'string' },
            coordinates: {
              type: 'object',
              properties: {
                latitude: { type: 'number' },
                longitude: { type: 'number' },
              },
            },
          },
        },
        Venue: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            description: { type: 'string' },
            capacity: { type: 'number' },
            isActive: { type: 'boolean' },
          },
        },
        Table: {
          type: 'object',
          properties: {
            number: { type: 'string' },
            capacity: { type: 'number' },
            type: { type: 'string' },
            isOccupied: { type: 'boolean' },
            isActive: { type: 'boolean' },
            qrCode: { type: 'string' },
          },
        },
        MenuItem: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            description: { type: 'string' },
            price: { type: 'number' },
            modifiers: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  options: { type: 'array', items: { type: 'string' } },
                  price: { type: 'number' },
                },
              },
            },
            isAvailable: { type: 'boolean' },
            schedule: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  dayOfWeek: { type: 'number' },
                  openTime: { type: 'string' },
                  closeTime: { type: 'string' },
                  isAvailable: { type: 'boolean' },
                },
              },
            },
          },
        },
        Restaurant: {
          type: 'object',
          required: ['name'],
          properties: {
            name: { type: 'string' },
            locations: {
              type: 'array',
              items: { $ref: '#/components/schemas/Location' },
            },
            venues: {
              type: 'array',
              items: { $ref: '#/components/schemas/Venue' },
            },
            tables: {
              type: 'array',
              items: { $ref: '#/components/schemas/Table' },
            },
            menu: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  category: { type: 'string' },
                  items: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/MenuItem' },
                  },
                },
              },
            },
            adminIds: {
              type: 'array',
              items: { type: 'string' },
            },
            schedule: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  dayOfWeek: { type: 'number' },
                  openTime: { type: 'string' },
                  closeTime: { type: 'string' },
                  isHoliday: { type: 'boolean' },
                },
              },
            },
          },
        },
      },
    },
    tags: [
      {
        name: 'Restaurants',
        description: 'Restaurant management endpoints'
      },
      {
        name: 'Menus',
        description: 'Menu management endpoints'
      },
      {
        name: 'Categories',
        description: 'Menu category management endpoints'
      },
      {
        name: 'Tables',
        description: 'Table management endpoints'
      },
      {
        name: 'Venues',
        description: 'Venue management endpoints'
      },
      {
        name: 'Zones',
        description: 'Zone management endpoints'
      },
      {
        name: 'Modifiers',
        description: 'Menu modifier management endpoints'
      }
    ]
  },
  apis: [
    path.join(__dirname, '../controllers/*.ts'),
    path.join(__dirname, '../routes/*.ts')
  ]
};

const swaggerSpec = swaggerJsdoc(options);

function swaggerDocs(app: Express, port: number) {
  // Swagger Page
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'INSEAT API Documentation',
    swaggerOptions: {
      persistAuthorization: true
    }
  }));

  // Docs in JSON format
  app.get('/api-docs.json', (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });

  console.log(`📝 Swagger Docs available at http://localhost:${port}/api-docs`);
}

export default swaggerDocs;
