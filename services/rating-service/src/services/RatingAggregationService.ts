import mongoose from 'mongoose';
import { Review, RatingCache, IReview, IRatingCache } from '../models/Review';

export class RatingAggregationService {
  
  // Wilson Score for robust ranking with small sample sizes
  calculateWilsonScore(positive: number, total: number): number {
    if (total === 0) return 0;
    const z = 1.96; // 95% confidence
    const phat = positive / total;
    const denominator = 1 + z*z/total;
    return (phat + z*z/(2*total) - z*Math.sqrt((phat*(1-phat) + z*z/(4*total))/total)) / denominator;
  }

  // Bayesian average to handle items with few ratings
  calculateBayesianAverage(ratings: number[], globalAverage: number, confidence: number = 10): number {
    const sum = ratings.reduce((a, b) => a + b, 0);
    return (confidence * globalAverage + sum) / (confidence + ratings.length);
  }

  // Time-weighted average giving more weight to recent ratings
  calculateTimeWeightedAverage(ratings: Array<{rating: number, date: Date}>): number {
    const now = Date.now();
    const maxAge = 365 * 24 * 60 * 60 * 1000; // 1 year in ms

    let weightedSum = 0;
    let totalWeight = 0;

    ratings.forEach(({rating, date}) => {
      const age = now - date.getTime();
      const weight = Math.max(0.1, 1 - (age / maxAge)); // Minimum 10% weight
      weightedSum += rating * weight;
      totalWeight += weight;
    });

    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  // Calculate rating distribution
  calculateDistribution(reviews: IReview[]): { 1: number; 2: number; 3: number; 4: number; 5: number; } {
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviews.forEach(review => {
      distribution[review.rating as keyof typeof distribution]++;
    });
    return distribution;
  }

  // Calculate recent trend (comparing last 30 days vs previous 30 days)
  calculateRecentTrend(reviews: IReview[]): number {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);

    const recentReviews = reviews.filter(r => r.createdAt >= thirtyDaysAgo);
    const previousReviews = reviews.filter(r => r.createdAt >= sixtyDaysAgo && r.createdAt < thirtyDaysAgo);

    if (recentReviews.length === 0 && previousReviews.length === 0) return 0;
    if (previousReviews.length === 0) return recentReviews.length > 0 ? 1 : 0;

    const recentAvg = recentReviews.reduce((sum, r) => sum + r.rating, 0) / recentReviews.length;
    const previousAvg = previousReviews.reduce((sum, r) => sum + r.rating, 0) / previousReviews.length;

    return recentAvg - previousAvg;
  }

  // Main aggregation method for menu items
  async aggregateMenuItemRatings(menuItemId: mongoose.Types.ObjectId): Promise<IRatingCache['aggregatedData']> {
    const reviews = await Review.find({ 
      menuItemId, 
      flagged: false 
    }).sort({ createdAt: -1 });

    if (reviews.length === 0) {
      return {
        average: 0,
        count: 0,
        wilsonScore: 0,
        bayesianAverage: 0,
        recentTrend: 0,
        distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
      };
    }

    const ratings = reviews.map(r => r.rating);
    const average = ratings.reduce((sum, r) => sum + r, 0) / ratings.length;
    const count = reviews.length;

    // Calculate Wilson Score (treating 4-5 star ratings as "positive")
    const positiveRatings = reviews.filter(r => r.rating >= 4).length;
    const wilsonScore = this.calculateWilsonScore(positiveRatings, count);

    // Get global average for Bayesian calculation
    const globalAverage = await this.getGlobalAverageRating();
    const bayesianAverage = this.calculateBayesianAverage(ratings, globalAverage);

    const recentTrend = this.calculateRecentTrend(reviews);
    const distribution = this.calculateDistribution(reviews);

    return {
      average: Math.round(average * 100) / 100,
      count,
      wilsonScore: Math.round(wilsonScore * 100) / 100,
      bayesianAverage: Math.round(bayesianAverage * 100) / 100,
      recentTrend: Math.round(recentTrend * 100) / 100,
      distribution
    };
  }

  // Get global average rating across all menu items
  private async getGlobalAverageRating(): Promise<number> {
    const result = await Review.aggregate([
      { $match: { flagged: false } },
      { $group: { _id: null, averageRating: { $avg: '$rating' } } }
    ]);

    return result.length > 0 ? result[0].averageRating : 3.5; // Default to 3.5 if no reviews
  }

  // Update cached ratings for a menu item
  async updateMenuItemRatingCache(menuItemId: mongoose.Types.ObjectId): Promise<void> {
    const aggregatedData = await this.aggregateMenuItemRatings(menuItemId);

    await RatingCache.findOneAndUpdate(
      { entityType: 'menuItem', entityId: menuItemId },
      {
        aggregatedData,
        lastCalculated: new Date(),
        ttl: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      },
      { upsert: true, new: true }
    );
  }

  // Aggregate restaurant ratings based on menu item ratings
  async aggregateRestaurantRatings(restaurantId: mongoose.Types.ObjectId): Promise<IRatingCache['aggregatedData']> {
    const reviews = await Review.find({ 
      restaurantId, 
      flagged: false 
    }).sort({ createdAt: -1 });

    if (reviews.length === 0) {
      return {
        average: 0,
        count: 0,
        wilsonScore: 0,
        bayesianAverage: 0,
        recentTrend: 0,
        distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
      };
    }

    const ratings = reviews.map(r => r.rating);
    const average = ratings.reduce((sum, r) => sum + r, 0) / ratings.length;
    const count = reviews.length;

    const positiveRatings = reviews.filter(r => r.rating >= 4).length;
    const wilsonScore = this.calculateWilsonScore(positiveRatings, count);

    const globalAverage = await this.getGlobalAverageRating();
    const bayesianAverage = this.calculateBayesianAverage(ratings, globalAverage);

    const recentTrend = this.calculateRecentTrend(reviews);
    const distribution = this.calculateDistribution(reviews);

    return {
      average: Math.round(average * 100) / 100,
      count,
      wilsonScore: Math.round(wilsonScore * 100) / 100,
      bayesianAverage: Math.round(bayesianAverage * 100) / 100,
      recentTrend: Math.round(recentTrend * 100) / 100,
      distribution
    };
  }

  // Update cached ratings for a restaurant
  async updateRestaurantRatingCache(restaurantId: mongoose.Types.ObjectId): Promise<void> {
    const aggregatedData = await this.aggregateRestaurantRatings(restaurantId);

    await RatingCache.findOneAndUpdate(
      { entityType: 'restaurant', entityId: restaurantId },
      {
        aggregatedData,
        lastCalculated: new Date(),
        ttl: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      },
      { upsert: true, new: true }
    );
  }

  // Get cached rating or calculate if not cached
  async getMenuItemRating(menuItemId: mongoose.Types.ObjectId): Promise<IRatingCache['aggregatedData']> {
    const cached = await RatingCache.findOne({
      entityType: 'menuItem',
      entityId: menuItemId,
      ttl: { $gt: new Date() }
    });

    if (cached) {
      return cached.aggregatedData;
    }

    // Calculate and cache if not found or expired
    const aggregatedData = await this.aggregateMenuItemRatings(menuItemId);
    await this.updateMenuItemRatingCache(menuItemId);
    return aggregatedData;
  }

  // Get cached restaurant rating or calculate if not cached
  async getRestaurantRating(restaurantId: mongoose.Types.ObjectId): Promise<IRatingCache['aggregatedData']> {
    const cached = await RatingCache.findOne({
      entityType: 'restaurant',
      entityId: restaurantId,
      ttl: { $gt: new Date() }
    });

    if (cached) {
      return cached.aggregatedData;
    }

    // Calculate and cache if not found or expired
    const aggregatedData = await this.aggregateRestaurantRatings(restaurantId);
    await this.updateRestaurantRatingCache(restaurantId);
    return aggregatedData;
  }

  // Bulk update ratings for multiple menu items (for batch processing)
  async bulkUpdateMenuItemRatings(menuItemIds: mongoose.Types.ObjectId[]): Promise<void> {
    const promises = menuItemIds.map(id => this.updateMenuItemRatingCache(id));
    await Promise.all(promises);
  }

  // Get top-rated menu items for a restaurant
  async getTopRatedMenuItems(restaurantId: mongoose.Types.ObjectId, limit: number = 10): Promise<any[]> {
    return await RatingCache.find({
      entityType: 'menuItem'
    })
    .populate({
      path: 'entityId',
      match: { restaurantId },
      select: 'name description price'
    })
    .sort({ 'aggregatedData.wilsonScore': -1 })
    .limit(limit)
    .lean();
  }
}