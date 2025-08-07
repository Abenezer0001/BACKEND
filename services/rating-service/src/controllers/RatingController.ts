import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Review, IReview } from '../models/Review';
import { RatingAggregationService } from '../services/RatingAggregationService';
import { RatingNotificationService } from '../services/RatingNotificationService';

export class RatingController {
  private aggregationService: RatingAggregationService;
  private notificationService: RatingNotificationService;

  constructor() {
    this.aggregationService = new RatingAggregationService();
    this.notificationService = new RatingNotificationService();
  }

  // Submit new rating
  async submitRating(req: Request, res: Response): Promise<void> {
    try {
      const { menuItemId, restaurantId, rating, comment, orderId } = req.body;
      const userId = (req as any).user?.userId;

      if (!userId) {
        res.status(401).json({ 
          success: false, 
          message: 'Authentication required' 
        });
        return;
      }

      // Validate required fields
      if (!menuItemId || !restaurantId || !rating || !comment) {
        res.status(400).json({
          success: false,
          message: 'menuItemId, restaurantId, rating, and comment are required'
        });
        return;
      }

      // Validate rating range and decimal precision
      if (rating < 1 || rating > 5) {
        res.status(400).json({
          success: false,
          message: 'Rating must be between 1.0 and 5.0'
        });
        return;
      }

      // Validate decimal precision (max 1 decimal place)
      if (Number((rating * 10) % 10) % 1 !== 0) {
        res.status(400).json({
          success: false,
          message: 'Rating must have at most 1 decimal place (e.g., 4.7)'
        });
        return;
      }

      // Check if user already rated this menu item
      const existingReview = await Review.findOne({
        menuItemId: new mongoose.Types.ObjectId(menuItemId),
        userId: new mongoose.Types.ObjectId(userId)
      });

      if (existingReview) {
        res.status(409).json({
          success: false,
          message: 'You have already rated this menu item'
        });
        return;
      }

      // Verify purchase if orderId provided
      let verifiedPurchase = false;
      if (orderId) {
        // Check if the order exists and belongs to the user
        const Order = mongoose.model('Order');
        const order = await Order.findOne({
          _id: new mongoose.Types.ObjectId(orderId),
          userId: new mongoose.Types.ObjectId(userId),
          'items.menuItem': new mongoose.Types.ObjectId(menuItemId)
        });
        verifiedPurchase = !!order;
      }

      // Create new review
      const review = new Review({
        menuItemId: new mongoose.Types.ObjectId(menuItemId),
        restaurantId: new mongoose.Types.ObjectId(restaurantId),
        userId: new mongoose.Types.ObjectId(userId),
        orderId: orderId ? new mongoose.Types.ObjectId(orderId) : undefined,
        rating,
        comment: comment.trim(),
        verifiedPurchase
      });

      await review.save();

      // Update rating cache asynchronously
      this.aggregationService.updateMenuItemRatingCache(
        new mongoose.Types.ObjectId(menuItemId)
      ).catch(console.error);

      this.aggregationService.updateRestaurantRatingCache(
        new mongoose.Types.ObjectId(restaurantId)
      ).catch(console.error);

      // Send real-time notification
      this.notificationService.broadcastRatingUpdate(
        menuItemId,
        await this.aggregationService.getMenuItemRating(new mongoose.Types.ObjectId(menuItemId))
      ).catch(console.error);

      res.status(201).json({
        success: true,
        message: 'Review submitted successfully',
        data: review
      });

    } catch (error) {
      console.error('Error submitting rating:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to submit rating',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Get menu item ratings
  async getMenuItemRatings(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { page = 1, limit = 10, sortBy = 'recent' } = req.query;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({
          success: false,
          message: 'Invalid menu item ID'
        });
        return;
      }

      const menuItemId = new mongoose.Types.ObjectId(id);

      // Get aggregated rating data
      const aggregatedData = await this.aggregationService.getMenuItemRating(menuItemId);

      // Get individual reviews with pagination
      let sortCriteria: any = { createdAt: -1 }; // Default: most recent first

      if (sortBy === 'helpful') {
        sortCriteria = { 'helpfulVotes.up': -1, createdAt: -1 };
      } else if (sortBy === 'rating_high') {
        sortCriteria = { rating: -1, createdAt: -1 };
      } else if (sortBy === 'rating_low') {
        sortCriteria = { rating: 1, createdAt: -1 };
      } else if (sortBy === 'verified') {
        sortCriteria = { verifiedPurchase: -1, createdAt: -1 };
      }

      const skip = (Number(page) - 1) * Number(limit);
      const reviews = await Review.find({ 
        menuItemId, 
        flagged: false 
      })
      .populate('userId', 'firstName lastName')
      .sort(sortCriteria)
      .skip(skip)
      .limit(Number(limit))
      .lean();

      const totalReviews = await Review.countDocuments({ 
        menuItemId, 
        flagged: false 
      });

      res.json({
        success: true,
        data: {
          aggregated: aggregatedData,
          reviews,
          pagination: {
            currentPage: Number(page),
            totalPages: Math.ceil(totalReviews / Number(limit)),
            totalReviews,
            hasNext: skip + reviews.length < totalReviews,
            hasPrevious: Number(page) > 1
          }
        }
      });

    } catch (error) {
      console.error('Error getting menu item ratings:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get menu item ratings',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Get menu item rating statistics (aggregated data only)
  async getMenuItemStats(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({
          success: false,
          message: 'Invalid menu item ID'
        });
        return;
      }

      const menuItemId = new mongoose.Types.ObjectId(id);

      // Get aggregated rating data
      const aggregatedData = await this.aggregationService.getMenuItemRating(menuItemId);

      if (!aggregatedData) {
        res.status(404).json({
          success: false,
          message: 'Menu item not found or has no ratings'
        });
        return;
      }

      res.json({
        success: true,
        data: aggregatedData
      });

    } catch (error) {
      console.error('Error getting menu item stats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get menu item stats',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Get restaurant aggregate ratings
  async getRestaurantRatings(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({
          success: false,
          message: 'Invalid restaurant ID'
        });
        return;
      }

      const restaurantId = new mongoose.Types.ObjectId(id);
      const aggregatedData = await this.aggregationService.getRestaurantRating(restaurantId);

      // Get top-rated menu items
      const topRatedItems = await this.aggregationService.getTopRatedMenuItems(restaurantId, 5);

      res.json({
        success: true,
        data: {
          aggregated: aggregatedData,
          topRatedItems: topRatedItems.filter(item => item.entityId) // Filter out null matches
        }
      });

    } catch (error) {
      console.error('Error getting restaurant ratings:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get restaurant ratings',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Update existing rating
  async updateRating(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { rating, comment } = req.body;
      const userId = (req as any).user?.userId;

      if (!userId) {
        res.status(401).json({ 
          success: false, 
          message: 'Authentication required' 
        });
        return;
      }

      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({
          success: false,
          message: 'Invalid review ID'
        });
        return;
      }

      // Validate rating if provided
      if (rating && (rating < 1 || rating > 5)) {
        res.status(400).json({
          success: false,
          message: 'Rating must be between 1.0 and 5.0'
        });
        return;
      }

      // Validate decimal precision if rating provided
      if (rating && Number((rating * 10) % 10) % 1 !== 0) {
        res.status(400).json({
          success: false,
          message: 'Rating must have at most 1 decimal place (e.g., 4.7)'
        });
        return;
      }

      const review = await Review.findOne({
        _id: new mongoose.Types.ObjectId(id),
        userId: new mongoose.Types.ObjectId(userId)
      });

      if (!review) {
        res.status(404).json({
          success: false,
          message: 'Review not found or unauthorized'
        });
        return;
      }

      // Update fields if provided
      if (rating !== undefined) review.rating = rating;
      if (comment !== undefined) review.comment = comment.trim();
      review.updatedAt = new Date();

      await review.save();

      // Update rating cache asynchronously
      this.aggregationService.updateMenuItemRatingCache(review.menuItemId).catch(console.error);
      this.aggregationService.updateRestaurantRatingCache(review.restaurantId).catch(console.error);

      res.json({
        success: true,
        message: 'Review updated successfully',
        data: review
      });

    } catch (error) {
      console.error('Error updating rating:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update rating',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Delete rating
  async deleteRating(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.userId;

      if (!userId) {
        res.status(401).json({ 
          success: false, 
          message: 'Authentication required' 
        });
        return;
      }

      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({
          success: false,
          message: 'Invalid review ID'
        });
        return;
      }

      const review = await Review.findOneAndDelete({
        _id: new mongoose.Types.ObjectId(id),
        userId: new mongoose.Types.ObjectId(userId)
      }) as unknown as IReview | null;

      if (!review) {
        res.status(404).json({
          success: false,
          message: 'Review not found or unauthorized'
        });
        return;
      }
      
      // Update rating cache asynchronously (review is the deleted document)
      const menuItemId = review.menuItemId;
      const restaurantId = review.restaurantId;
      this.aggregationService.updateMenuItemRatingCache(menuItemId).catch(console.error);
      this.aggregationService.updateRestaurantRatingCache(restaurantId).catch(console.error);

      res.json({
        success: true,
        message: 'Review deleted successfully'
      });

    } catch (error) {
      console.error('Error deleting rating:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete rating',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Get user's ratings
  async getUserRatings(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { page = 1, limit = 10 } = req.query;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({
          success: false,
          message: 'Invalid user ID'
        });
        return;
      }

      const skip = (Number(page) - 1) * Number(limit);
      const reviews = await Review.find({ 
        userId: new mongoose.Types.ObjectId(id),
        flagged: false 
      })
      .populate('menuItemId', 'name description price')
      .populate('restaurantId', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean();

      const totalReviews = await Review.countDocuments({ 
        userId: new mongoose.Types.ObjectId(id),
        flagged: false 
      });

      res.json({
        success: true,
        data: {
          reviews,
          pagination: {
            currentPage: Number(page),
            totalPages: Math.ceil(totalReviews / Number(limit)),
            totalReviews,
            hasNext: skip + reviews.length < totalReviews,
            hasPrevious: Number(page) > 1
          }
        }
      });

    } catch (error) {
      console.error('Error getting user ratings:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get user ratings',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Mark review as helpful
  async markHelpful(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { helpful } = req.body; // true for helpful, false for not helpful
      const userId = (req as any).user?.userId;

      if (!userId) {
        res.status(401).json({ 
          success: false, 
          message: 'Authentication required' 
        });
        return;
      }

      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({
          success: false,
          message: 'Invalid review ID'
        });
        return;
      }

      if (typeof helpful !== 'boolean') {
        res.status(400).json({
          success: false,
          message: 'helpful field must be a boolean'
        });
        return;
      }

      const update = helpful 
        ? { $inc: { 'helpfulVotes.up': 1 } }
        : { $inc: { 'helpfulVotes.down': 1 } };

      const review = await Review.findByIdAndUpdate(
        new mongoose.Types.ObjectId(id),
        update,
        { new: true }
      );

      if (!review) {
        res.status(404).json({
          success: false,
          message: 'Review not found'
        });
        return;
      }

      res.json({
        success: true,
        message: `Review marked as ${helpful ? 'helpful' : 'not helpful'}`,
        data: {
          helpfulVotes: review.helpfulVotes
        }
      });

    } catch (error) {
      console.error('Error marking review as helpful:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update helpful votes',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // ADMIN DASHBOARD ENDPOINTS

  // Get restaurant rating analytics for admin dashboard
  async getRestaurantAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({
          success: false,
          message: 'Invalid restaurant ID'
        });
        return;
      }

      const restaurantId = new mongoose.Types.ObjectId(id);

      // Get all ratings for restaurant
      const ratings = await Review.find({ 
        restaurantId,
        flagged: false 
      }).sort({ createdAt: -1 });

      if (ratings.length === 0) {
        res.json({
          success: true,
          data: {
            totalReviews: 0,
            averageRating: 0,
            ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
            trends: { period: 'month', data: [] },
            recentReviews: []
          }
        });
        return;
      }

      // Calculate analytics
      const totalReviews = ratings.length;
      const averageRating = ratings.reduce((sum, r) => sum + r.rating, 0) / totalReviews;

      const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      ratings.forEach(r => {
        ratingDistribution[r.rating as keyof typeof ratingDistribution]++;
      });

      // Get recent reviews (last 10)
      const recentReviews = ratings
        .slice(0, 10)
        .map(r => ({
          _id: r._id,
          rating: r.rating,
          comment: r.comment,
          customerName: r.userId ? 'Customer' : 'Anonymous', // We'll populate this properly later
          createdAt: r.createdAt,
          isAnonymous: !r.userId
        }));

      // Calculate monthly trends (mock data for now - should be implemented with proper date aggregation)
      const trendsData: Array<{month: string, averageRating: number, reviewCount: number}> = [];
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthRatings = ratings.filter(r => {
          const ratingMonth = new Date(r.createdAt);
          return ratingMonth.getMonth() === month.getMonth() && 
                 ratingMonth.getFullYear() === month.getFullYear();
        });
        
        trendsData.push({
          month: month.toISOString().slice(0, 7), // YYYY-MM format
          averageRating: monthRatings.length > 0 
            ? monthRatings.reduce((sum, r) => sum + r.rating, 0) / monthRatings.length 
            : 0,
          reviewCount: monthRatings.length
        });
      }

      res.json({
        success: true,
        data: {
          totalReviews,
          averageRating: Math.round(averageRating * 10) / 10,
          ratingDistribution,
          trends: { period: 'month', data: trendsData },
          recentReviews
        }
      });

    } catch (error) {
      console.error('Error getting restaurant analytics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get restaurant analytics',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Get restaurant reviews with pagination for admin dashboard
  async getRestaurantReviews(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { page = 1, limit = 10, sortBy = 'recent', filter } = req.query;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({
          success: false,
          message: 'Invalid restaurant ID'
        });
        return;
      }

      const restaurantId = new mongoose.Types.ObjectId(id);
      const pageNum = parseInt(String(page), 10);
      const limitNum = parseInt(String(limit), 10);
      const skip = (pageNum - 1) * limitNum;

      // Build query
      let query: any = { restaurantId };
      if (filter === 'flagged') {
        query.flagged = true;
      } else {
        query.flagged = false;
      }

      // Build sort criteria
      let sortCriteria: any = { createdAt: -1 }; // Default: most recent first
      if (sortBy === 'rating_high') {
        sortCriteria = { rating: -1, createdAt: -1 };
      } else if (sortBy === 'rating_low') {
        sortCriteria = { rating: 1, createdAt: -1 };
      } else if (sortBy === 'helpful') {
        sortCriteria = { 'helpfulVotes.up': -1, createdAt: -1 };
      }

      // Get reviews with pagination
      const reviews = await Review.find(query)
        .populate('userId', 'firstName lastName email')
        .populate('menuItemId', 'name')
        .sort(sortCriteria)
        .skip(skip)
        .limit(limitNum)
        .lean();

      const total = await Review.countDocuments(query);

      // Transform reviews for admin view
      const transformedReviews = reviews.map(r => ({
        _id: r._id,
        rating: r.rating,
        comment: r.comment,
        customerName: r.userId ? `${(r.userId as any).firstName} ${(r.userId as any).lastName}` : 'Anonymous',
        customerEmail: r.userId ? (r.userId as any).email : null,
        menuItemName: r.menuItemId ? (r.menuItemId as any).name : 'Unknown Item',
        createdAt: r.createdAt,
        flagged: r.flagged || false,
        verifiedPurchase: r.verifiedPurchase || false,
        helpful: (r.helpfulVotes?.up || 0) - (r.helpfulVotes?.down || 0)
      }));

      res.json({
        success: true,
        data: {
          reviews: transformedReviews,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            pages: Math.ceil(total / limitNum),
            hasNext: skip + reviews.length < total,
            hasPrevious: pageNum > 1
          }
        }
      });

    } catch (error) {
      console.error('Error getting restaurant reviews:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get restaurant reviews',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Get menu items performance for admin dashboard
  async getMenuItemsPerformance(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { sortBy = 'rating', limit = 20 } = req.query;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({
          success: false,
          message: 'Invalid restaurant ID'
        });
        return;
      }

      const restaurantId = new mongoose.Types.ObjectId(id);

      // Aggregate menu item performance
      const pipeline: any[] = [
        { $match: { restaurantId, flagged: false } },
        {
          $group: {
            _id: "$menuItemId",
            averageRating: { $avg: "$rating" },
            reviewCount: { $sum: 1 },
            totalHelpful: { $sum: { $ifNull: ["$helpfulVotes.up", 0] } },
            ratingDistribution: {
              $push: "$rating"
            },
            recentReviews: {
              $push: {
                rating: "$rating",
                comment: "$comment",
                createdAt: "$createdAt"
              }
            }
          }
        }
      ];

      // Add sorting
      if (sortBy === 'reviews') {
        pipeline.push({ $sort: { reviewCount: -1 } });
      } else if (sortBy === 'helpful') {
        pipeline.push({ $sort: { totalHelpful: -1 } });
      } else {
        pipeline.push({ $sort: { averageRating: -1 } });
      }

      pipeline.push({ $limit: parseInt(String(limit), 10) });

      const menuPerformance = await Review.aggregate(pipeline);

      // Get menu item details
      const menuItemIds = menuPerformance.map(item => item._id).filter(Boolean);
      const MenuItem = mongoose.model('MenuItem');
      const menuItems = await MenuItem.find({
        _id: { $in: menuItemIds },
        restaurantId
      }).lean();

      const menuItemMap = new Map();
      menuItems.forEach((item: any) => {
        menuItemMap.set(item._id.toString(), item);
      });

      // Transform performance data
      const performanceData = menuPerformance
        .filter(item => item._id && menuItemMap.has(item._id.toString()))
        .map(item => {
          const menuItem = menuItemMap.get(item._id.toString());
          const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
          item.ratingDistribution.forEach((rating: number) => {
            distribution[rating as keyof typeof distribution]++;
          });

          return {
            menuItemId: item._id,
            menuItemName: menuItem?.name || 'Unknown Item',
            menuItemImage: menuItem?.image || null,
            menuItemPrice: menuItem?.price || 0,
            averageRating: Math.round(item.averageRating * 10) / 10,
            reviewCount: item.reviewCount,
            totalHelpful: item.totalHelpful,
            ratingDistribution: distribution,
            recentReviews: item.recentReviews
              .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              .slice(0, 3)
          };
        });

      res.json({
        success: true,
        data: {
          menuItems: performanceData,
          summary: {
            totalMenuItems: performanceData.length,
            averageRating: performanceData.length > 0 
              ? performanceData.reduce((sum, item) => sum + item.averageRating, 0) / performanceData.length 
              : 0,
            totalReviews: performanceData.reduce((sum, item) => sum + item.reviewCount, 0)
          }
        }
      });

    } catch (error) {
      console.error('Error getting menu items performance:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get menu items performance',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Get customer insights for admin dashboard
  async getCustomerInsights(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { period = '30d', limit = 50 } = req.query;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({
          success: false,
          message: 'Invalid restaurant ID'
        });
        return;
      }

      const restaurantId = new mongoose.Types.ObjectId(id);

      // Calculate date filter based on period
      let dateFilter = {};
      const now = new Date();
      if (period === '7d') {
        dateFilter = { createdAt: { $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) } };
      } else if (period === '30d') {
        dateFilter = { createdAt: { $gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) } };
      } else if (period === '90d') {
        dateFilter = { createdAt: { $gte: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000) } };
      }

      // Aggregate customer insights
      const pipeline: any[] = [
        { $match: { restaurantId, flagged: false, ...dateFilter } },
        {
          $group: {
            _id: "$userId",
            averageRating: { $avg: "$rating" },
            reviewCount: { $sum: 1 },
            lastReview: { $max: "$createdAt" },
            firstReview: { $min: "$createdAt" },
            verifiedReviews: { $sum: { $cond: ["$verifiedPurchase", 1, 0] } },
            ratings: { $push: "$rating" }
          }
        },
        { $match: { _id: { $ne: null } } }, // Filter out anonymous reviews
        { $sort: { reviewCount: -1 } },
        { $limit: parseInt(String(limit), 10) }
      ];

      const customerInsights = await Review.aggregate(pipeline);

      // Get customer details
      const customerIds = customerInsights.map(c => c._id).filter(Boolean);
      const User = mongoose.model('User');
      const customers = await User.find({
        _id: { $in: customerIds }
      }).select('firstName lastName email').lean();

      const customerMap = new Map();
      customers.forEach((customer: any) => {
        customerMap.set(customer._id.toString(), customer);
      });

      // Transform customer insights
      const transformedInsights = customerInsights
        .filter(c => c._id && customerMap.has(c._id.toString()))
        .map(c => {
          const customer = customerMap.get(c._id.toString());
          const daysSinceFirst = Math.floor((now.getTime() - new Date(c.firstReview).getTime()) / (1000 * 60 * 60 * 24));
          const daysSinceLast = Math.floor((now.getTime() - new Date(c.lastReview).getTime()) / (1000 * 60 * 60 * 24));

          return {
            customerId: c._id,
            customerName: `${customer?.firstName || ''} ${customer?.lastName || ''}`.trim() || 'Unknown Customer',
            customerEmail: customer?.email,
            averageRating: Math.round(c.averageRating * 10) / 10,
            reviewCount: c.reviewCount,
            verifiedReviews: c.verifiedReviews,
            lastReview: c.lastReview,
            firstReview: c.firstReview,
            daysSinceFirstReview: daysSinceFirst,
            daysSinceLastReview: daysSinceLast,
            isActiveReviewer: daysSinceLast <= 30,
            loyaltyScore: Math.min(100, (c.reviewCount * 10) + (c.verifiedReviews * 5) + Math.max(0, 50 - daysSinceLast))
          };
        });

      // Calculate summary statistics
      const totalCustomers = transformedInsights.length;
      const activeCustomers = transformedInsights.filter(c => c.isActiveReviewer).length;
      const loyalCustomers = transformedInsights.filter(c => c.loyaltyScore > 70).length;
      const averageReviewsPerCustomer = totalCustomers > 0 
        ? transformedInsights.reduce((sum, c) => sum + c.reviewCount, 0) / totalCustomers 
        : 0;
      const averageCustomerRating = totalCustomers > 0 
        ? transformedInsights.reduce((sum, c) => sum + c.averageRating, 0) / totalCustomers 
        : 0;

      res.json({
        success: true,
        data: {
          customerInsights: transformedInsights,
          summary: {
            totalCustomers,
            activeCustomers,
            loyalCustomers,
            averageReviewsPerCustomer: Math.round(averageReviewsPerCustomer * 10) / 10,
            averageCustomerRating: Math.round(averageCustomerRating * 10) / 10,
            period: period as string
          }
        }
      });

    } catch (error) {
      console.error('Error getting customer insights:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get customer insights',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Submit rating for a specific order item
  async submitOrderItemRating(req: Request, res: Response): Promise<void> {
    try {
      const { orderId, menuItemId, rating, comment } = req.body;
      const userId = (req as any).user?.userId;

      if (!userId) {
        res.status(401).json({ 
          success: false, 
          message: 'Authentication required' 
        });
        return;
      }

      // Validate required fields
      if (!orderId || !menuItemId || !rating || !comment) {
        res.status(400).json({
          success: false,
          message: 'orderId, menuItemId, rating, and comment are required'
        });
        return;
      }

      // Validate rating range and decimal precision
      if (rating < 1 || rating > 5) {
        res.status(400).json({
          success: false,
          message: 'Rating must be between 1.0 and 5.0'
        });
        return;
      }

      // Validate decimal precision (max 1 decimal place)
      if (Number((rating * 10) % 10) % 1 !== 0) {
        res.status(400).json({
          success: false,
          message: 'Rating must have at most 1 decimal place (e.g., 4.7)'
        });
        return;
      }

      // Verify the order exists and belongs to the user
      const Order = mongoose.model('Order');
      const order = await Order.findOne({
        _id: new mongoose.Types.ObjectId(orderId),
        userId: new mongoose.Types.ObjectId(userId),
        paymentStatus: 'PAID',
        'items.menuItem': new mongoose.Types.ObjectId(menuItemId)
      }).populate('restaurantId', '_id');

      if (!order) {
        res.status(404).json({
          success: false,
          message: 'Order not found, not paid, or does not contain the specified menu item'
        });
        return;
      }

      // Check if user already rated this menu item
      const existingReview = await Review.findOne({
        menuItemId: new mongoose.Types.ObjectId(menuItemId),
        userId: new mongoose.Types.ObjectId(userId)
      });

      if (existingReview) {
        res.status(409).json({
          success: false,
          message: 'You have already rated this menu item'
        });
        return;
      }

      // Create new review with verified purchase
      const review = new Review({
        menuItemId: new mongoose.Types.ObjectId(menuItemId),
        restaurantId: order.restaurantId,
        userId: new mongoose.Types.ObjectId(userId),
        orderId: new mongoose.Types.ObjectId(orderId),
        rating,
        comment: comment.trim(),
        verifiedPurchase: true
      });

      await review.save();

      // Update rating cache asynchronously
      this.aggregationService.updateMenuItemRatingCache(
        new mongoose.Types.ObjectId(menuItemId)
      ).catch(console.error);

      this.aggregationService.updateRestaurantRatingCache(
        order.restaurantId
      ).catch(console.error);

      // Send real-time notification
      this.notificationService.broadcastRatingUpdate(
        menuItemId,
        await this.aggregationService.getMenuItemRating(new mongoose.Types.ObjectId(menuItemId))
      ).catch(console.error);

      res.status(201).json({
        success: true,
        message: 'Order item review submitted successfully',
        data: review
      });

    } catch (error) {
      console.error('Error submitting order item rating:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to submit order item rating',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Check if user can rate a specific menu item
  async canUserRateMenuItem(req: Request, res: Response): Promise<void> {
    try {
      const { menuItemId } = req.params;
      const userId = (req as any).user?.userId;

      if (!userId) {
        res.status(401).json({ 
          success: false, 
          message: 'Authentication required' 
        });
        return;
      }

      if (!mongoose.Types.ObjectId.isValid(menuItemId)) {
        res.status(400).json({
          success: false,
          message: 'Invalid menu item ID'
        });
        return;
      }

      const menuItemObjectId = new mongoose.Types.ObjectId(menuItemId);
      const userObjectId = new mongoose.Types.ObjectId(userId);

      // Check if user has already rated this menu item
      const existingReview = await Review.findOne({
        menuItemId: menuItemObjectId,
        userId: userObjectId
      });

      if (existingReview) {
        res.json({
          success: true,
          data: {
            canRate: false,
            reason: 'already_rated',
            message: 'You have already rated this menu item',
            existingRating: {
              id: existingReview._id,
              rating: existingReview.rating,
              comment: existingReview.comment,
              createdAt: existingReview.createdAt
            }
          }
        });
        return;
      }

      // Check if user has ordered this menu item
      const Order = mongoose.model('Order');
      const userOrder = await Order.findOne({
        userId: userObjectId,
        'items.menuItem': menuItemObjectId,
        paymentStatus: 'PAID' // Only allow rating for paid orders
      }).select('_id orderNumber createdAt');

      if (!userOrder) {
        res.json({
          success: true,
          data: {
            canRate: false,
            reason: 'not_purchased',
            message: 'You can only rate menu items you have ordered'
          }
        });
        return;
      }

      res.json({
        success: true,
        data: {
          canRate: true,
          reason: 'eligible',
          message: 'You can rate this menu item',
          orderDetails: {
            orderId: userOrder._id,
            orderNumber: userOrder.orderNumber,
            orderDate: userOrder.createdAt
          }
        }
      });

    } catch (error) {
      console.error('Error checking if user can rate menu item:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to check rating eligibility',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}