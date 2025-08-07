import { Router } from 'express';
import MenuItem from '../../../restaurant-service/src/models/MenuItem';
import VectorSearchService from '../services/VectorSearchService';
import { asyncHandler } from '../../../auth-service/src/middleware/errorHandler';

const router = Router();

// Get all menu items with pagination and filtering
router.get('/', asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    category,
    dietary,
    minPrice,
    maxPrice,
    available = true,
    search,
    restaurantId
  } = req.query;

  const filter: any = {};
  
  // Apply filters
  if (available !== 'false') {
    filter.isAvailable = true;
  }
  
  if (category) {
    filter.categories = category;
  }

  if (restaurantId) {
    filter.restaurantId = restaurantId;
  }
  
  if (dietary) {
    const dietaryArray = Array.isArray(dietary) ? dietary : [dietary];
    filter.allergens = { $nin: dietaryArray };
  }
  
  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = parseFloat(minPrice as string);
    if (maxPrice) filter.price.$lte = parseFloat(maxPrice as string);
  }

  // If search query provided, use vector search
  if (search) {
    const searchOptions = {
      limit: parseInt(limit as string),
      category: category as string,
      dietaryRestrictions: dietary ? (Array.isArray(dietary) ? dietary as string[] : [dietary as string]) : [],
      minPrice: minPrice ? parseFloat(minPrice as string) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice as string) : undefined,
      restaurantId: restaurantId as string
    };
    
    const results = await VectorSearchService.search(search as string, searchOptions);
    
    return res.json({
      items: results,
      total: results.length,
      page: parseInt(page as string),
      totalPages: 1,
      hasNextPage: false,
      hasPrevPage: false
    });
  }

  // Regular database query with pagination
  const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
  const items = await MenuItem.find(filter)
    .skip(skip)
    .limit(parseInt(limit as string))
    .sort({ name: 1 });

  const total = await MenuItem.countDocuments(filter);
  const totalPages = Math.ceil(total / parseInt(limit as string));

  res.json({
    items,
    total,
    page: parseInt(page as string),
    totalPages,
    hasNextPage: parseInt(page as string) < totalPages,
    hasPrevPage: parseInt(page as string) > 1
  });
}));

// Get menu item by ID
router.get('/:id', asyncHandler(async (req, res) => {
  const item = await MenuItem.findById(req.params.id);
  
  if (!item) {
    return res.status(404).json({ error: 'Menu item not found' });
  }

  res.json(item);
}));

// Get similar items
router.get('/:id/similar', asyncHandler(async (req, res) => {
  const { limit = 5 } = req.query;
  const similarItems = await VectorSearchService.getSimilarItems(
    req.params.id, 
    parseInt(limit as string)
  );

  res.json(similarItems);
}));

// Get menu categories
router.get('/meta/categories', asyncHandler(async (req, res) => {
  const { restaurantId } = req.query;
  const filter: any = { isAvailable: true };
  
  if (restaurantId) {
    filter.restaurantId = restaurantId;
  }

  const categories = await MenuItem.distinct('categories', filter);
  const subcategories = await MenuItem.distinct('subCategories', filter);
  
  res.json({
    categories: categories.filter(Boolean),
    subcategories: subcategories.filter(Boolean)
  });
}));

// Get dietary options
router.get('/meta/dietary', asyncHandler(async (req, res) => {
  const { restaurantId } = req.query;
  const filter: any = {};
  
  if (restaurantId) {
    filter.restaurantId = restaurantId;
  }

  const allergens = await MenuItem.distinct('allergens', filter);
  res.json(allergens.filter(Boolean));
}));

// Search by category
router.get('/category/:category', asyncHandler(async (req, res) => {
  const { limit = 20, restaurantId } = req.query;
  const items = await VectorSearchService.searchByCategory(
    req.params.category,
    parseInt(limit as string)
  );

  // Filter by restaurant if specified
  if (restaurantId) {
    const filteredItems = items.filter(item => 
      item.restaurantId?.toString() === restaurantId
    );
    return res.json(filteredItems);
  }

  res.json(items);
}));

// Search by dietary restrictions
router.post('/dietary', asyncHandler(async (req, res) => {
  const { restrictions, limit = 20, restaurantId } = req.body;
  
  if (!restrictions || !Array.isArray(restrictions)) {
    return res.status(400).json({ error: 'Invalid dietary restrictions format' });
  }

  const items = await VectorSearchService.searchByDietaryRestrictions(
    restrictions,
    parseInt(limit)
  );

  // Filter by restaurant if specified
  if (restaurantId) {
    const filteredItems = items.filter(item => 
      item.restaurantId?.toString() === restaurantId
    );
    return res.json(filteredItems);
  }

  res.json(items);
}));

// Get vector search stats
router.get('/stats/search', asyncHandler(async (req, res) => {
  const stats = VectorSearchService.getStats();
  res.json(stats);
}));

// Refresh vector search index
router.post('/refresh', asyncHandler(async (req, res) => {
  await VectorSearchService.refresh();
  res.json({ 
    message: 'Vector search index refreshed successfully',
    timestamp: new Date().toISOString()
  });
}));

export default router; 