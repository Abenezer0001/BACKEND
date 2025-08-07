import mongoose from 'mongoose';
import { Redis } from 'ioredis';

export interface DiscoveryParams {
  location: [number, number]; // [lng, lat]
  radius?: number;
  cuisine?: string[];
  priceRange?: string[];
  minRating?: number;
  promotionsOnly?: boolean;
  sortBy?: 'relevance' | 'rating' | 'distance' | 'price_low' | 'price_high';
  limit?: number;
  cursor?: string;
  openNow?: boolean;
  deliveryOnly?: boolean;
  features?: string[]; // e.g., ['outdoor_seating', 'wifi', 'parking']
}

export interface RestaurantWithMetrics {
  _id: mongoose.Types.ObjectId;
  name: string;
  cuisine: string[];
  averageRating: number;
  reviewCount: number;
  priceRange: string;
  menuHighlights: string[];
  activePromotions: Array<{
    description: string;
    discountPercentage: number;
    validUntil: Date;
  }>;
  distanceKm: number;
  estimatedDeliveryTime: number;
  relevanceScore: number;
  isOpen: boolean;
  nextOpenTime?: Date;
  features: string[];
  location: {
    address: string;
    coordinates: {
      latitude: number;
      longitude: number;
    };
  };
}

export class RestaurantDiscoveryService {
  private redis: Redis;

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      maxRetriesPerRequest: 3
    });
  }

  async discoverRestaurants(params: DiscoveryParams): Promise<{
    restaurants: RestaurantWithMetrics[];
    pagination: {
      hasNext: boolean;
      nextCursor?: string;
      total: number;
    };
  }> {
    const pipeline = this.buildDiscoveryPipeline(params);

    // Check cache first
    const cacheKey = this.generateCacheKey(params);
    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      console.warn('Redis cache miss or error:', error);
    }

    const restaurants = await mongoose.connection.db
      .collection('restaurants')
      .aggregate(pipeline)
      .toArray() as RestaurantWithMetrics[];

    const result = {
      restaurants: restaurants.slice(0, params.limit || 20),
      pagination: {
        hasNext: restaurants.length > (params.limit || 20),
        nextCursor: restaurants.length > (params.limit || 20) 
          ? restaurants[params.limit || 20]._id.toString() 
          : undefined,
        total: restaurants.length
      }
    };

    // Cache results for 5 minutes
    try {
      await this.redis.setex(cacheKey, 300, JSON.stringify(result));
    } catch (error) {
      console.warn('Redis cache set error:', error);
    }

    return result;
  }

  private buildDiscoveryPipeline(params: DiscoveryParams): any[] {
    const pipeline: any[] = [];

    // Stage 1: Geospatial filtering
    if (params.location && params.radius) {
      pipeline.push({
        $geoNear: {
          near: {
            type: "Point",
            coordinates: params.location
          },
          distanceField: "distance",
          maxDistance: (params.radius || 5) * 1000, // Convert km to meters
          spherical: true,
          query: this.buildMatchQuery(params)
        }
      });
    } else {
      // If no geospatial query, use regular match
      pipeline.push({
        $match: this.buildMatchQuery(params)
      });
    }

    // Stage 2: Lookup menu items with ratings
    pipeline.push({
      $lookup: {
        from: "menuitems",
        localField: "_id",
        foreignField: "restaurantId",
        as: "menuItems",
        pipeline: [
          { $match: { isActive: true, featured: true } },
          { $sort: { "ratings.average": -1 } },
          { $limit: 3 },
          { $project: { name: 1, price: 1, "ratings.average": 1 } }
        ]
      }
    });

    // Stage 3: Lookup active promotions
    pipeline.push({
      $lookup: {
        from: "promotions",
        let: { restaurantId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$restaurantId", "$$restaurantId"] },
                  { $lte: ["$startDate", new Date()] },
                  { $gte: ["$endDate", new Date()] },
                  { $eq: ["$isActive", true] }
                ]
              }
            }
          },
          {
            $project: {
              description: 1,
              discountPercentage: 1,
              validUntil: "$endDate"
            }
          }
        ],
        as: "activePromotions"
      }
    });

    // Stage 4: Lookup cached ratings
    pipeline.push({
      $lookup: {
        from: "ratingcaches",
        let: { restaurantId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$entityType", "restaurant"] },
                  { $eq: ["$entityId", "$$restaurantId"] },
                  { $gt: ["$ttl", new Date()] }
                ]
              }
            }
          }
        ],
        as: "ratingCache"
      }
    });

    // Stage 5: Calculate operating hours and status
    pipeline.push({
      $addFields: {
        isOpen: {
          $let: {
            vars: {
              now: new Date(),
              currentDay: { $dayOfWeek: new Date() }, // 1 = Sunday, 7 = Saturday
              currentTime: {
                $dateToString: {
                  date: new Date(),
                  format: "%H:%M"
                }
              }
            },
            in: {
              $anyElementTrue: {
                $map: {
                  input: "$schedule",
                  as: "sched",
                  in: {
                    $and: [
                      { $eq: ["$$sched.dayOfWeek", { $subtract: ["$$currentDay", 1] }] },
                      { $not: "$$sched.isHoliday" },
                      { $lte: ["$$sched.openTime", "$$currentTime"] },
                      { $gte: ["$$sched.closeTime", "$$currentTime"] }
                    ]
                  }
                }
              }
            }
          }
        }
      }
    });

    // Stage 6: Calculate aggregated metrics
    pipeline.push({
      $addFields: {
        hasActivePromotions: { $gt: [{ $size: "$activePromotions" }, 0] },
        bestDiscount: { 
          $ifNull: [
            { $max: "$activePromotions.discountPercentage" },
            0
          ]
        },
        menuHighlights: {
          $map: {
            input: { $slice: ["$menuItems", 3] },
            as: "item",
            in: "$$item.name"
          }
        },
        averageRating: {
          $ifNull: [
            { $arrayElemAt: ["$ratingCache.aggregatedData.average", 0] },
            0
          ]
        },
        reviewCount: {
          $ifNull: [
            { $arrayElemAt: ["$ratingCache.aggregatedData.count", 0] },
            0
          ]
        },
        averageItemRating: { 
          $ifNull: [
            { $avg: "$menuItems.ratings.average" },
            0
          ]
        },
        distanceKm: { 
          $ifNull: [
            { $divide: ["$distance", 1000] },
            0
          ]
        },
        estimatedDeliveryTime: {
          $add: [
            30, // Base preparation time
            { $multiply: [{ $divide: [{ $ifNull: ["$distance", 0] }, 1000] }, 2] } // 2 min per km
          ]
        }
      }
    });

    // Stage 7: Calculate relevance scoring algorithm
    pipeline.push({
      $addFields: {
        relevanceScore: {
          $add: [
            // Restaurant rating weight (30%)
            { $multiply: ["$averageRating", 0.3] },
            // Menu rating weight (25%)
            { $multiply: ["$averageItemRating", 0.25] },
            // Promotion bonus (20%)
            { 
              $cond: [
                "$hasActivePromotions", 
                { $add: [0.2, { $multiply: ["$bestDiscount", 0.01] }] }, 
                0
              ]
            },
            // Distance penalty (15%) - closer is better
            { 
              $multiply: [
                { $divide: [5, { $add: ["$distanceKm", 1] }] }, 
                0.15
              ]
            },
            // Open status bonus (10%)
            { $cond: ["$isOpen", 0.1, 0] }
          ]
        }
      }
    });

    // Stage 8: Apply filters
    const matchFilters: any = {};
    
    if (params.minRating) {
      matchFilters.averageRating = { $gte: params.minRating };
    }
    
    if (params.promotionsOnly) {
      matchFilters.hasActivePromotions = true;
    }
    
    if (params.openNow) {
      matchFilters.isOpen = true;
    }
    
    if (Object.keys(matchFilters).length > 0) {
      pipeline.push({ $match: matchFilters });
    }

    // Stage 9: Sort and paginate
    const sortStage: any = {};
    switch (params.sortBy) {
      case 'rating':
        sortStage.averageRating = -1;
        sortStage._id = 1; // Secondary sort for consistency
        break;
      case 'distance':
        sortStage.distanceKm = 1;
        sortStage._id = 1;
        break;
      case 'price_low':
        sortStage.priceRange = 1;
        sortStage.averageRating = -1;
        break;
      case 'price_high':
        sortStage.priceRange = -1;
        sortStage.averageRating = -1;
        break;
      case 'relevance':
      default:
        sortStage.relevanceScore = -1;
        sortStage._id = 1;
    }
    pipeline.push({ $sort: sortStage });

    // Stage 10: Cursor-based pagination
    if (params.cursor) {
      pipeline.push({
        $match: { _id: { $gt: new mongoose.Types.ObjectId(params.cursor) } }
      });
    }

    pipeline.push({ $limit: (params.limit || 20) + 1 }); // +1 to check for next page

    // Stage 11: Final projection
    pipeline.push({
      $project: {
        name: 1,
        cuisine: 1,
        priceRange: 1,
        averageRating: { $round: ["$averageRating", 1] },
        reviewCount: 1,
        menuHighlights: 1,
        activePromotions: 1,
        distanceKm: { $round: ["$distanceKm", 1] },
        estimatedDeliveryTime: { $round: ["$estimatedDeliveryTime", 0] },
        relevanceScore: { $round: ["$relevanceScore", 2] },
        isOpen: 1,
        features: 1,
        "location.address": { $arrayElemAt: ["$locations.address", 0] },
        "location.coordinates": {
          latitude: { $arrayElemAt: ["$locations.coordinates.latitude", 0] },
          longitude: { $arrayElemAt: ["$locations.coordinates.longitude", 0] }
        }
      }
    });

    return pipeline;
  }

  private buildMatchQuery(params: DiscoveryParams): any {
    const query: any = {
      isActive: true
    };

    if (params.cuisine && params.cuisine.length > 0) {
      query.cuisine = { $in: params.cuisine };
    }

    if (params.priceRange && params.priceRange.length > 0) {
      query.priceRange = { $in: params.priceRange };
    }

    if (params.features && params.features.length > 0) {
      query.features = { $all: params.features };
    }

    if (params.deliveryOnly) {
      query.deliveryAvailable = true;
    }

    return query;
  }

  generateCacheKey(params: DiscoveryParams): string {
    // Create deterministic cache key from search parameters
    const normalized = {
      lat: params.location ? Math.round(params.location[1] * 1000) / 1000 : null,
      lng: params.location ? Math.round(params.location[0] * 1000) / 1000 : null,
      radius: params.radius || 5,
      cuisine: params.cuisine?.sort() || [],
      priceRange: params.priceRange?.sort() || [],
      minRating: params.minRating || 0,
      promotionsOnly: params.promotionsOnly || false,
      openNow: params.openNow || false,
      deliveryOnly: params.deliveryOnly || false,
      features: params.features?.sort() || [],
      sortBy: params.sortBy || 'relevance',
      limit: params.limit || 20
    };

    return `restaurants:discover:${Buffer.from(JSON.stringify(normalized)).toString('base64')}`;
  }

  // Search restaurants by text query
  async searchRestaurants(query: string, location?: [number, number], limit: number = 10): Promise<RestaurantWithMetrics[]> {
    const pipeline: any[] = [];

    // Text search stage
    pipeline.push({
      $match: {
        $text: { $search: query },
        isActive: true
      }
    });

    // Add score for text relevance
    pipeline.push({
      $addFields: {
        textScore: { $meta: "textScore" }
      }
    });

    // Add geospatial distance if location provided
    if (location) {
      pipeline.push({
        $addFields: {
          distance: {
            $let: {
              vars: {
                lat1: { $arrayElemAt: ["$locations.coordinates.latitude", 0] },
                lng1: { $arrayElemAt: ["$locations.coordinates.longitude", 0] },
                lat2: location[1],
                lng2: location[0]
              },
              in: {
                $multiply: [
                  6371000, // Earth radius in meters
                  {
                    $acos: {
                      $add: [
                        {
                          $multiply: [
                            { $sin: { $multiply: ["$$lat1", Math.PI / 180] } },
                            { $sin: { $multiply: ["$$lat2", Math.PI / 180] } }
                          ]
                        },
                        {
                          $multiply: [
                            { $cos: { $multiply: ["$$lat1", Math.PI / 180] } },
                            { $cos: { $multiply: ["$$lat2", Math.PI / 180] } },
                            {
                              $cos: {
                                $multiply: [
                                  { $subtract: ["$$lng2", "$$lng1"] },
                                  Math.PI / 180
                                ]
                              }
                            }
                          ]
                        }
                      ]
                    }
                  }
                ]
              }
            }
          }
        }
      });
    }

    // Lookup ratings and other data
    pipeline.push({
      $lookup: {
        from: "ratingcaches",
        let: { restaurantId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$entityType", "restaurant"] },
                  { $eq: ["$entityId", "$$restaurantId"] }
                ]
              }
            }
          }
        ],
        as: "ratingCache"
      }
    });

    // Calculate final relevance score combining text and location
    pipeline.push({
      $addFields: {
        averageRating: {
          $ifNull: [
            { $arrayElemAt: ["$ratingCache.aggregatedData.average", 0] },
            0
          ]
        },
        distanceKm: location ? { $divide: ["$distance", 1000] } : 0,
        relevanceScore: {
          $add: [
            { $multiply: ["$textScore", 0.6] }, // Text relevance 60%
            { $multiply: [{ $ifNull: [{ $arrayElemAt: ["$ratingCache.aggregatedData.average", 0] }, 0] }, 0.3] }, // Rating 30%
            location ? { $multiply: [{ $divide: [5, { $add: [{ $divide: ["$distance", 1000] }, 1] }] }, 0.1] } : 0 // Distance 10%
          ]
        }
      }
    });

    // Sort by relevance
    pipeline.push({ $sort: { relevanceScore: -1 } });
    pipeline.push({ $limit: limit });

    // Final projection
    pipeline.push({
      $project: {
        name: 1,
        cuisine: 1,
        priceRange: 1,
        averageRating: { $round: ["$averageRating", 1] },
        distanceKm: { $round: ["$distanceKm", 1] },
        relevanceScore: { $round: ["$relevanceScore", 2] },
        "location.address": { $arrayElemAt: ["$locations.address", 0] }
      }
    });

    return await mongoose.connection.db
      .collection('restaurants')
      .aggregate(pipeline)
      .toArray() as RestaurantWithMetrics[];
  }

  // Get trending restaurants based on recent activity
  async getTrendingRestaurants(location?: [number, number], limit: number = 10): Promise<RestaurantWithMetrics[]> {
    const pipeline: any[] = [];

    // Start with active restaurants
    pipeline.push({
      $match: { isActive: true }
    });

    // Lookup recent orders (last 7 days)
    pipeline.push({
      $lookup: {
        from: "orders",
        let: { restaurantId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$restaurantId", "$$restaurantId"] },
                  { $gte: ["$createdAt", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)] }
                ]
              }
            }
          }
        ],
        as: "recentOrders"
      }
    });

    // Lookup recent reviews
    pipeline.push({
      $lookup: {
        from: "reviews",
        let: { restaurantId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$restaurantId", "$$restaurantId"] },
                  { $gte: ["$createdAt", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)] }
                ]
              }
            }
          }
        ],
        as: "recentReviews"
      }
    });

    // Calculate trending score
    pipeline.push({
      $addFields: {
        orderVolume: { $size: "$recentOrders" },
        reviewVolume: { $size: "$recentReviews" },
        recentRating: {
          $ifNull: [
            { $avg: "$recentReviews.rating" },
            0
          ]
        },
        trendingScore: {
          $add: [
            { $multiply: [{ $size: "$recentOrders" }, 0.5] }, // Order volume 50%
            { $multiply: [{ $size: "$recentReviews" }, 0.3] }, // Review volume 30%
            { $multiply: [{ $ifNull: [{ $avg: "$recentReviews.rating" }, 0] }, 0.2] } // Recent rating 20%
          ]
        }
      }
    });

    // Filter restaurants with meaningful activity
    pipeline.push({
      $match: {
        $or: [
          { orderVolume: { $gte: 1 } },
          { reviewVolume: { $gte: 1 } }
        ]
      }
    });

    // Add geospatial distance if location provided
    if (location) {
      pipeline.push({
        $addFields: {
          distance: {
            $let: {
              vars: {
                lat1: { $arrayElemAt: ["$locations.coordinates.latitude", 0] },
                lng1: { $arrayElemAt: ["$locations.coordinates.longitude", 0] },
                lat2: location[1],
                lng2: location[0]
              },
              in: {
                $multiply: [
                  6371000,
                  {
                    $acos: {
                      $add: [
                        {
                          $multiply: [
                            { $sin: { $multiply: ["$$lat1", Math.PI / 180] } },
                            { $sin: { $multiply: ["$$lat2", Math.PI / 180] } }
                          ]
                        },
                        {
                          $multiply: [
                            { $cos: { $multiply: ["$$lat1", Math.PI / 180] } },
                            { $cos: { $multiply: ["$$lat2", Math.PI / 180] } },
                            {
                              $cos: {
                                $multiply: [
                                  { $subtract: ["$$lng2", "$$lng1"] },
                                  Math.PI / 180
                                ]
                              }
                            }
                          ]
                        }
                      ]
                    }
                  }
                ]
              }
            }
          },
          distanceKm: { $divide: ["$distance", 1000] }
        }
      });

      // Boost score for nearby restaurants
      pipeline.push({
        $addFields: {
          trendingScore: {
            $add: [
              "$trendingScore",
              { $multiply: [{ $divide: [5, { $add: ["$distanceKm", 1] }] }, 0.1] }
            ]
          }
        }
      });
    }

    // Sort by trending score
    pipeline.push({ $sort: { trendingScore: -1 } });
    pipeline.push({ $limit: limit });

    // Final projection
    pipeline.push({
      $project: {
        name: 1,
        cuisine: 1,
        priceRange: 1,
        orderVolume: 1,
        reviewVolume: 1,
        recentRating: { $round: ["$recentRating", 1] },
        trendingScore: { $round: ["$trendingScore", 2] },
        distanceKm: location ? { $round: ["$distanceKm", 1] } : undefined,
        "location.address": { $arrayElemAt: ["$locations.address", 0] }
      }
    });

    return await mongoose.connection.db
      .collection('restaurants')
      .aggregate(pipeline)
      .toArray() as RestaurantWithMetrics[];
  }

  // Invalidate cache for restaurant updates
  async invalidateRestaurantCache(restaurantId: string): Promise<void> {
    try {
      const pattern = `restaurants:discover:*`;
      const keys = await this.redis.keys(pattern);
      
      if (keys.length > 0) {
        await this.redis.del(...keys);
        console.log(`Invalidated ${keys.length} restaurant discovery cache entries`);
      }
    } catch (error) {
      console.warn('Error invalidating restaurant cache:', error);
    }
  }
}