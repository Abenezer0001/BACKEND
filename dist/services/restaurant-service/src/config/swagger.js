"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const swagger_jsdoc_1 = __importDefault(require("swagger-jsdoc"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const path_1 = __importDefault(require("path"));
const options = {
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
        components: {
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
    },
    apis: [
        path_1.default.join(__dirname, '../controllers/*.ts'),
        path_1.default.join(__dirname, '../routes/*.ts')
    ]
};
const swaggerSpec = (0, swagger_jsdoc_1.default)(options);
function swaggerDocs(app, port) {
    // Swagger Page
    app.use('/api-docs', swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swaggerSpec));
    // Docs in JSON format
    app.get('/api-docs.json', (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.send(swaggerSpec);
    });
    console.log(`📝 Swagger Docs available at http://localhost:${port}/api-docs`);
}
exports.default = swaggerDocs;
