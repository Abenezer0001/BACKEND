import { Request, Response } from 'express';
import Restaurant from '../models/Restaurant';
import Venue from '../models/Venue';
import Table from '../models/Table';
import mongoose from 'mongoose';

interface AuthenticatedRequest extends Request {
  user?: {
    userId?: string;
    _id?: string;
    email?: string;
    role?: string;
    restaurantId?: mongoose.Types.ObjectId;
    businessId?: mongoose.Types.ObjectId;
  };
}

export class VenueController {
  // Create a new venue
  public async create(req: Request, res: Response): Promise<void> {
    try {
      const { restaurantId } = req.params;
      const { name, description, capacity, isActive, serviceCharge } = req.body;

      // Validate required fields
      if (!name || !description || !capacity) {
        res.status(400).json({ error: 'Missing required fields: name, description, or capacity' });
        return;
      }

      // Validate capacity is a positive number
      const capacityNum = parseInt(capacity);
      if (isNaN(capacityNum) || capacityNum <= 0) {
        res.status(400).json({ error: 'Capacity must be a positive number' });
        return;
      }

      // Validate service charge if provided
      if (serviceCharge) {
        if (!['percentage', 'flat'].includes(serviceCharge.type)) {
          res.status(400).json({ error: 'Service charge type must be either "percentage" or "flat"' });
          return;
        }
        if (typeof serviceCharge.value !== 'number' || serviceCharge.value < 0) {
          res.status(400).json({ error: 'Service charge value must be a non-negative number' });
          return;
        }
        if (serviceCharge.minAmount !== undefined && (typeof serviceCharge.minAmount !== 'number' || serviceCharge.minAmount < 0)) {
          res.status(400).json({ error: 'Service charge minimum amount must be a non-negative number' });
          return;
        }
        if (serviceCharge.maxAmount !== undefined && (typeof serviceCharge.maxAmount !== 'number' || serviceCharge.maxAmount < 0)) {
          res.status(400).json({ error: 'Service charge maximum amount must be a non-negative number' });
          return;
        }
        if (serviceCharge.minAmount !== undefined && serviceCharge.maxAmount !== undefined && serviceCharge.minAmount > serviceCharge.maxAmount) {
          res.status(400).json({ error: 'Service charge minimum amount cannot be greater than maximum amount' });
          return;
        }
      }

      // Validate restaurantId is a valid ObjectId
      if (!mongoose.Types.ObjectId.isValid(restaurantId)) {
        res.status(400).json({ error: 'Invalid restaurant ID format' });
        return;
      }

      // Find the restaurant by ID
      const restaurant = await Restaurant.findById(restaurantId);
      if (!restaurant) {
        res.status(404).json({ error: 'Restaurant not found' });
        return;
      }

      // Create a new venue document
      const venueData: any = {
        name,
        description,
        capacity: capacityNum,
        restaurantId: new mongoose.Types.ObjectId(restaurantId),
        isActive: isActive ?? true
      };

      // Add service charge if provided
      if (serviceCharge) {
        venueData.serviceCharge = serviceCharge;
      }

      const venue = new Venue(venueData);
      
      // Save the venue as a separate document
      const savedVenue = await venue.save();
      
      // Add the venue reference to the restaurant using $push
      await Restaurant.findByIdAndUpdate(
        restaurantId,
        { $push: { venues: savedVenue._id } },
        { new: true }
      );
      
      res.status(201).json(savedVenue);
    } catch (error) {
      console.error('Error creating venue:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ error: 'Error creating venue', details: errorMessage, statusCode: 500 });
    }
  }

  // Get all venues
  public async getAll(req: Request, res: Response): Promise<void> {
    try {
      const { restaurantId } = req.params;
      
      // Validate restaurantId is a valid ObjectId
      if (!mongoose.Types.ObjectId.isValid(restaurantId)) {
        res.status(400).json({ error: 'Invalid restaurant ID format' });
        return;
      }
      
      // Find all venues for this restaurant
      const venues = await Venue.find({ restaurantId });
      
      res.status(200).json(venues);
    } catch (error) {
      console.error('Error fetching venues:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ error: 'Error fetching venues', details: errorMessage });
    }
  }

  // Get all venues
  public async getAllVenues(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const currentUser = req.user;
      let query: any = {};

      // Restaurant admin can only see venues from their business
      if (currentUser?.role === 'restaurant_admin' && currentUser.businessId) {
        // Find restaurants that belong to the user's business
        const businessRestaurants = await Restaurant.find({ 
          businessId: currentUser.businessId 
        }).select('_id');
        
        const restaurantIds = businessRestaurants.map(r => r._id);
        query.restaurantId = { $in: restaurantIds };
      }

      const venues = await Venue.find(query)
        .populate({
          path: 'restaurantId',
          select: 'name description _id businessId'
        });
      res.status(200).json(venues);
    } catch (error) {
      console.error('Error fetching all venues:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ 
        error: 'Error fetching venues', 
        details: errorMessage 
      });
    }
  }

  // Get venue by ID
  public async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      // Validate ID is a valid ObjectId
      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({ error: 'Invalid ID format' });
        return;
      }
      
      const venue = await Venue.findById(id).populate({
        path: 'restaurantId',
        select: 'name description _id'
      });
      
      if (!venue) {
        res.status(404).json({ error: 'Venue not found' });
        return;
      }

      res.status(200).json(venue);
    } catch (error) {
      console.error('Error fetching venue:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ error: 'Error fetching venue', details: errorMessage });
    }
  }

  // Update venue
  public async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updateData = req.body;
      
      // Validate ID is a valid ObjectId
      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({ error: 'Invalid ID format' });
        return;
      }

      const venue = await Venue.findByIdAndUpdate(id, updateData, { new: true });
      
      if (!venue) {
        res.status(404).json({ error: 'Venue not found' });
        return;
      }

      res.status(200).json(venue);
    } catch (error) {
      console.error('Error updating venue:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ error: 'Error updating venue', details: errorMessage });
    }
  }

  // Delete venue
  public async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      // Validate ID is a valid ObjectId
      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({ error: 'Invalid ID format' });
        return;
      }
      
      const venue = await Venue.findByIdAndRemove(id);
      
      if (!venue) {
        res.status(404).json({ error: 'Venue not found' });
        return;
      }

      // Remove the venue reference from the restaurant
      const restaurant = await Restaurant.findOneAndUpdate(
        { venues: id },
        { $pull: { venues: id } }
      );

      res.status(200).json({ message: 'Venue deleted successfully' });
    } catch (error) {
      console.error('Error deleting venue:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ error: 'Error deleting venue', details: errorMessage });
    }
  }

  // Get tables of venue
  public async getTables(req: Request, res: Response): Promise<void> {
    try {
      const { venueId } = req.params;
      
      // Validate ID is a valid ObjectId
      if (!mongoose.Types.ObjectId.isValid(venueId)) {
        res.status(400).json({ error: 'Invalid ID format' });
        return;
      }
      
      const venue = await Venue.findById(venueId);
      
      if (!venue) {
        res.status(404).json({ error: 'Venue not found' });
        return;
      }

      // Get tables associated with this venue
      const tables = await Table.find({ venueId });
      
      res.status(200).json(tables);
    } catch (error) {
      console.error('Error fetching tables:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ error: 'Error fetching tables', details: errorMessage });
    }
  }

  // Create new table for venue
  public async createTable(req: Request, res: Response): Promise<void> {
    try {
      const { venueId } = req.params;
      const tableData = req.body;
      
      // Validate ID is a valid ObjectId
      if (!mongoose.Types.ObjectId.isValid(venueId)) {
        res.status(400).json({ error: 'Invalid ID format' });
        return;
      }

      const venue = await Venue.findById(venueId);
      if (!venue) {
        res.status(404).json({ error: 'Venue not found' });
        return;
      }

      // Set the venueId for the table
      tableData.venueId = venueId;
      
      // Create a new table document
      const table = new Table(tableData);
      
      // Save the table as a separate document
      const savedTable = await table.save();
      
      res.status(201).json(savedTable);
    } catch (error) {
      console.error('Error creating table:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ error: 'Error creating table', details: errorMessage });
    }
  }
}
  