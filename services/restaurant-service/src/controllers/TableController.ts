import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Restaurant from '../models/Restaurant';
import Table, { ITable } from '../models/Table';
import TableType from '../models/TableType';
import Venue from '../models/Venue';
import Menu from '../models/Menu';
import Category from '../models/Category';
import SubCategory from '../models/SubCategory';
import MenuItem from '../models/MenuItem';
import Schedule from '../models/Schedule';
import * as QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';

export class TableController {
  // Create a new table
  public async create(req: Request, res: Response): Promise<void> {
    try {
      console.log('Creating table with params:', req.params);
      console.log('Table data:', req.body);
      
      const { restaurantId, venueId } = req.params;
      const tableData = req.body;

      if (!mongoose.Types.ObjectId.isValid(restaurantId)) {
        res.status(400).json({ error: 'Invalid restaurant ID format' });
        return;
      }

      if (!mongoose.Types.ObjectId.isValid(venueId)) {
        res.status(400).json({ error: 'Invalid venue ID format' });
        return;
      }

      // Check if restaurant exists
      const restaurant = await Restaurant.findById(restaurantId);
      if (!restaurant) {
        res.status(404).json({ error: 'Restaurant not found' });
        return;
      }

      // Check if venue exists in restaurant
      const venueExists = restaurant.venues.some(venue => venue.toString() === venueId);
      if (!venueExists) {
        res.status(404).json({ error: 'Venue not found in this restaurant' });
        return;
      }

      // Validate required fields
      if (!tableData.number || !tableData.capacity || !tableData.tableTypeId) {
        res.status(400).json({ error: 'Missing required fields: number, capacity, or tableTypeId' });
        return;
      }

      // Check if table number already exists in this venue
      const existingTable = await Table.findOne({
        venueId: new mongoose.Types.ObjectId(venueId),
        number: tableData.number
      });

      if (existingTable) {
        res.status(400).json({ error: 'Table number already exists in this venue' });
        return;
      }

      // Verify that the table type exists and belongs to this restaurant
      if (!mongoose.Types.ObjectId.isValid(tableData.tableTypeId)) {
        res.status(400).json({ error: 'Invalid table type ID format' });
        return;
      }

      const tableType = await TableType.findOne({
        _id: tableData.tableTypeId,
        restaurantId: new mongoose.Types.ObjectId(restaurantId)
      });

      if (!tableType) {
        res.status(404).json({ error: 'Table type not found for this restaurant' });
        return;
      }

      // Create a new table document
      const newTable = new Table({
        number: tableData.number,
        capacity: parseInt(tableData.capacity, 10),
        tableTypeId: new mongoose.Types.ObjectId(tableData.tableTypeId),
        venueId: new mongoose.Types.ObjectId(venueId),
        qrCode: '',
        isOccupied: false,
        isActive: tableData.isActive ?? true
      });

      console.log('Attempting to save new table:', newTable);

      // Save the new table to the Table collection
      const savedTable = await newTable.save();
      console.log('Table saved successfully:', savedTable);
      
      // Add the table's ID to the restaurant's tables array
      await Restaurant.findByIdAndUpdate(
        restaurantId,
        { $push: { tables: savedTable._id } },
        { new: true }
      );
      console.log('Restaurant updated with new table');

      res.status(201).json(savedTable);
    } catch (error) {
      console.error('Error creating table:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ error: `Error creating table: ${errorMessage}` });
    }
  }

  // Get all tables for a venue
  public async getAll(req: Request, res: Response): Promise<void> {
    try {
      const { restaurantId, venueId } = req.params;
      
      console.log(`Getting tables for venue: ${venueId} in restaurant: ${restaurantId}`);

      // Use the filtered tables method with both parameters
      // This simplifies and standardizes the logic
      req.query.restaurantId = restaurantId;
      req.query.venueId = venueId;
      
      // Call the getFilteredTables method to utilize the consolidated logic
      await this.getFilteredTables(req, res);
    } catch (error) {
      console.error('Error getting tables:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ error: `Error getting tables: ${errorMessage}` });
    }
  }

  // Get all tables for a restaurant (across all venues)
  public async getAllForRestaurant(req: Request, res: Response): Promise<void> {
    try {
      // Extract restaurantId from params or query parameters
      let restaurantId = req.params.restaurantId;
      
      // For debugging
      console.log('getAllForRestaurant called with:');
      console.log('- req.params:', req.params);
      console.log('- req.query:', req.query);
      console.log('- req.originalUrl:', req.originalUrl);
      
      // Try to extract restaurant ID from URL if not in params
      if (!restaurantId && req.originalUrl) {
        const urlParts = req.originalUrl.split('/');
        const restaurantsIndex = urlParts.findIndex(part => part === 'restaurants');
        if (restaurantsIndex !== -1 && urlParts.length > restaurantsIndex + 1) {
          restaurantId = urlParts[restaurantsIndex + 1];
          console.log('Extracted restaurantId from URL:', restaurantId);
        }
      }
      
      if (!restaurantId) {
        res.status(400).json({ error: 'Restaurant ID is required' });
        return;
      }
      
      console.log(`Searching for tables in restaurant with ID: ${restaurantId}`);
      
      // Direct table lookup by restaurantId to bypass the validation temporarily
      // This is a workaround to help debug the issue
      const tables = await Table.find({
        $or: [
          { restaurantId: restaurantId },
          { restaurantId: new mongoose.Types.ObjectId(restaurantId) }
        ]
      }).populate('tableTypeId');
      
      console.log(`Found ${tables.length} tables directly for restaurant: ${restaurantId}`);
      res.status(200).json(tables);
    } catch (error) {
      console.error('Error getting all tables for restaurant:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ error: `Error getting all tables for restaurant: ${errorMessage}` });
    }
  }
  
  // Direct raw query of tables without relationships (for debugging)
  public async getRawTables(req: Request, res: Response): Promise<void> {
    try {
      console.log('Running getRawTables - Direct database query');
      
      // Get the table collection directly
      const db = mongoose.connection.db;
      const tablesCollection = db.collection('tables');
      
      // Find all documents in the tables collection
      const rawTables = await tablesCollection.find({}).limit(100).toArray();
      console.log(`Raw DB query found ${rawTables.length} tables`); 
      
      // Return the raw data with count
      res.status(200).json({
        count: rawTables.length,
        tables: rawTables
      });
    } catch (error) {
      console.error('Error in raw tables query:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ error: `Raw table query failed: ${errorMessage}` });
    }
  }

  // Get table by ID directly (without restaurant/venue context)
  public async getTableById(req: Request, res: Response): Promise<void> {
    try {
      const { tableId } = req.params;
      console.log(`Directly fetching table by ID: ${tableId}`);
      
      // Find the table by ID
      const table = await Table.findById(tableId).populate('tableTypeId');
      
      if (!table) {
        res.status(404).json({ error: 'Table not found' });
        return;
      }
      
      console.log(`Found table: ${table.number}`);
      res.json(table);
    } catch (error) {
      console.error('Error getting table by ID:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ error: `Error getting table by ID: ${errorMessage}` });
    }
  }
  // Get filtered tables with optional restaurant and venue filters
  public async getFilteredTables(req: Request, res: Response): Promise<void> {
    try {
      const { restaurantId, venueId } = req.query;
      console.log(`Filtering tables - restaurantId: ${restaurantId}, venueId: ${venueId}`);
      
      // Build query based on provided filters
      let query: any = {};
      let tables: Array<ITable> = [];
      
      // Case 1: Both restaurantId and venueId are provided
      if (restaurantId && venueId) {
        // Validate IDs
        if (!mongoose.Types.ObjectId.isValid(restaurantId as string)) {
          res.status(400).json({ error: 'Invalid restaurant ID format' });
          return;
        }
        
        if (!mongoose.Types.ObjectId.isValid(venueId as string)) {
          res.status(400).json({ error: 'Invalid venue ID format' });
          return;
        }
        
        // Get tables for this specific venue without requiring restaurant validation
        // Just search by venueId and restaurantId
        query = { venueId, restaurantId };
        
        // Execute query immediately with populate
        tables = await Table.find(query).populate('tableTypeId');
        console.log(`Found ${tables.length} tables for venue ${venueId} in restaurant ${restaurantId}`);
        
      }
      // Case 2: Only restaurantId is provided
      else if (restaurantId) {
        // Validate restaurant ID
        if (!mongoose.Types.ObjectId.isValid(restaurantId as string)) {
          res.status(400).json({ error: 'Invalid restaurant ID format' });
          return;
        }
        
        // Skip restaurant validation and directly query for tables with this restaurantId
        // This is more robust and allows the front-end to display tables even if restaurant record
        // is missing or has a different structure
        console.log('Looking for tables with restaurantId:', restaurantId);
        query = { restaurantId: restaurantId };
        
        tables = await Table.find(query).populate('tableTypeId');
      }
      // Case 3: Only venueId is provided
      else if (venueId) {
        // Validate venue ID
        if (!mongoose.Types.ObjectId.isValid(venueId as string)) {
          res.status(400).json({ error: 'Invalid venue ID format' });
          return;
        }
        
        // Get tables for this venue
        tables = await Table.find({ venueId }).populate('tableTypeId');
      }
      // Case 4: No filters - return all tables (admin function)
      else {
        tables = await Table.find({}).populate('tableTypeId');
      }
      
      console.log(`Filtered query returned ${tables.length} tables`);
      res.json(tables);
    } catch (error) {
      console.error('Error filtering tables:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ error: `Error filtering tables: ${errorMessage}` });
    }
  }

  // Get tables directly by venueId (without requiring restaurant context)
  public async getTablesByVenue(req: Request, res: Response): Promise<void> {
    try {
      const { venueId } = req.params;
      console.log(`Getting tables for venue ID: ${venueId} directly`);
      
      // Use the filtered tables method with venue parameter
      req.query.venueId = venueId;
      
      // Call the getFilteredTables method to utilize the consolidated logic
      await this.getFilteredTables(req, res);
    } catch (error) {
      console.error('Error getting tables by venue ID:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ error: `Error getting tables by venue ID: ${errorMessage}` });
    }
  }

  // Update table occupied status
  public async updateOccupiedStatus(req: Request, res: Response): Promise<void> {
    try {
      const { tableId } = req.params;
      const { isOccupied } = req.body;
      
      if (typeof isOccupied !== 'boolean') {
        res.status(400).json({ error: 'isOccupied must be a boolean value' });
        return;
      }

      const table = await Table.findByIdAndUpdate(
        tableId,
        { isOccupied },
        { new: true }
      );

      if (!table) {
        res.status(404).json({ error: 'Table not found' });
        return;
      }

      res.json(table);
    } catch (error) {
      console.error('Error updating table occupied status:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ error: `Error updating table occupied status: ${errorMessage}` });
    }
  }

  // Direct update for table active status (without restaurant/venue context)
  public async updateStatus(req: Request, res: Response): Promise<void> {
    try {
      const { tableId } = req.params;
      const { isActive } = req.body;
      
      if (typeof isActive !== 'boolean') {
        res.status(400).json({ error: 'isActive must be a boolean value' });
        return;
      }

      const table = await Table.findByIdAndUpdate(
        tableId,
        { isActive },
        { new: true }
      );

      if (!table) {
        res.status(404).json({ error: 'Table not found' });
        return;
      }

      res.json(table);
    } catch (error) {
      console.error('Error updating table status:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ error: `Error updating table status: ${errorMessage}` });
    }
  }

  // Update table
  public async update(req: Request, res: Response): Promise<void> {
    try {
      const { restaurantId, tableId } = req.params;
      const updateData = req.body;

      // Check if restaurant exists and contains this table ID
      const restaurant = await Restaurant.findOne({
        _id: restaurantId,
        tables: { $in: [tableId] }
      });
      
      if (!restaurant) {
        res.status(404).json({ error: 'Restaurant or table not found' });
        return;
      }

      // Find and update the table in the Table collection
      const table = await Table.findById(tableId);
      if (!table) {
        res.status(404).json({ error: 'Table not found' });
        return;
      }
      
      // Ensure venueId is always present
      if (!updateData.venueId && !table.venueId) {
        res.status(400).json({ error: 'venueId is required' });
        return;
      }

      // If tableTypeId is being updated, verify it exists and belongs to this restaurant
      if (updateData.tableTypeId) {
        if (!mongoose.Types.ObjectId.isValid(updateData.tableTypeId)) {
          res.status(400).json({ error: 'Invalid table type ID format' });
          return;
        }

        const tableType = await TableType.findOne({
          _id: updateData.tableTypeId,
          restaurantId: new mongoose.Types.ObjectId(restaurantId)
        });

        if (!tableType) {
          res.status(404).json({ error: 'Table type not found for this restaurant' });
          return;
        }
      }

      // Update the table document
      const updatedTable = await Table.findByIdAndUpdate(
        tableId,
        { ...updateData },
        { new: true, runValidators: true }
      ).populate('tableTypeId');

      res.json(updatedTable);
    } catch (error) {
      console.error('Error updating table:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ error: `Error updating table: ${errorMessage}` });
    }
  }

  // Delete table
  public async delete(req: Request, res: Response): Promise<void> {
    try {
      const { restaurantId, tableId } = req.params;
      
      // Check if table exists
      const table = await Table.findById(tableId);
      if (!table) {
        res.status(404).json({ error: 'Table not found' });
        return;
      }
      
      // If restaurantId is provided, we're deleting from a restaurant context
      if (restaurantId) {
        // Check if restaurant exists
        const restaurant = await Restaurant.findById(restaurantId);
        if (!restaurant) {
          res.status(404).json({ error: 'Restaurant not found' });
          return;
        }
        
        // Remove the table ID from the restaurant's tables array
        await Restaurant.updateOne(
          { _id: restaurantId },
          { $pull: { tables: tableId } }
        );
      } else {
        // Direct deletion without restaurant context
        console.log(`Directly deleting table ${tableId} without restaurant context`);
      }

      // Delete the table document from the Table collection
      await Table.findByIdAndDelete(tableId);

      res.status(204).send();
    } catch (error) {
      console.error('Error deleting table:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ error: `Error deleting table: ${errorMessage}` });
    }
  }

  // Generate QR code for a table
  public async generateQRCode(req: Request, res: Response): Promise<void> {
    try {
      const { tableId, restaurantId } = req.params;
      
      console.log(`Generating QR code for tableId: ${tableId}, restaurantId from params: ${restaurantId}`);
      
      // Find the table in the Table collection
      const table = await Table.findById(tableId);
      if (!table) {
        res.status(404).json({ error: 'Table not found' });
        return;
      }
      
      // If restaurantId is provided in params, update the table with it
      if (restaurantId && !table.restaurantId) {
        console.log(`Updating table with restaurantId from params: ${restaurantId}`);
        table.restaurantId = restaurantId;
        await table.save();
      }

      // Get restaurant ID either from params or table record
      const effectiveRestaurantId = restaurantId || table.restaurantId;
      if (!effectiveRestaurantId) {
        res.status(400).json({ error: 'Restaurant ID is required' });
        return;
      }

      console.log(`Using restaurantId: ${effectiveRestaurantId} for QR code generation`);

      // Generate a unique identifier for the QR code
      const qrData = {
        restaurantId: effectiveRestaurantId,
        tableId: table._id,
        venueId: table.venueId,
        tableNumber: table.number,
        uniqueId: uuidv4(),
        timestamp: new Date().toISOString()
      };

      // Generate QR code
      const qrCode = await QRCode.toDataURL(JSON.stringify(qrData));

      // Update the table with the QR code and ensure restaurantId is set
      table.qrCode = qrCode;
      if (!table.restaurantId && effectiveRestaurantId) {
        table.restaurantId = effectiveRestaurantId;
      }
      await table.save();

      res.json({ 
        success: true,
        qrCode,
        metadata: {
          tableId: table._id,
          tableNumber: table.number,
          restaurantId: effectiveRestaurantId,
          venueId: table.venueId,
          generated: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error generating QR code:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ error: `Error generating QR code: ${errorMessage}` });
    }
  }

  // Get QR code for a table
  public async getQRCode(req: Request, res: Response): Promise<void> {
    try {
      const { tableId, restaurantId } = req.params;
      
      console.log(`Getting QR code for tableId: ${tableId}, restaurantId from params: ${restaurantId}`);

      // Find the table in the Table collection
      const table = await Table.findById(tableId);
      if (!table) {
        res.status(404).json({ error: 'Table not found' });
        return;
      }

      if (!table.qrCode) {
        res.status(404).json({ 
          error: 'QR code not found for this table',
          message: 'Please generate a QR code first using a POST request'
        });
        return;
      }
      
      // Get restaurant ID either from params or table record
      const effectiveRestaurantId = restaurantId || table.restaurantId;

      res.json({ 
        success: true,
        qrCode: table.qrCode,
        metadata: {
          tableId: table._id,
          tableNumber: table.number,
          restaurantId: effectiveRestaurantId,
          venueId: table.venueId,
          retrieved: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error getting QR code:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ error: `Error getting QR code: ${errorMessage}` });
    }
  }

  // Delete QR code for a table
  public async deleteQRCode(req: Request, res: Response): Promise<void> {
    try {
      const { tableId, restaurantId } = req.params;
      
      console.log(`Deleting QR code for tableId: ${tableId}, restaurantId from params: ${restaurantId}`);

      // Find the table in the Table collection
      const table = await Table.findById(tableId);
      if (!table) {
        res.status(404).json({ error: 'Table not found' });
        return;
      }

      // Remove the QR code
      table.qrCode = '';
      await table.save();

      // Get restaurant ID either from params or table record
      const effectiveRestaurantId = restaurantId || table.restaurantId;

      res.status(200).json({
        success: true,
        message: 'QR code successfully deleted',
        tableId: table._id,
        restaurantId: effectiveRestaurantId
      });
    } catch (error) {
      console.error('Error deleting QR code:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ error: `Error deleting QR code: ${errorMessage}` });
    }
  }

  /**
   * Verify if a table exists and is active
   * Returns table verification status and venue information if available
   */
  public async verifyTable(req: Request, res: Response): Promise<void> {
    try {
      const { tableId } = req.params;
      console.log(`Verifying table with ID: ${tableId}`);

      if (!mongoose.Types.ObjectId.isValid(tableId)) {
        res.status(400).json({ error: 'Invalid table ID format' });
        return;
      }

      // Default response structure
      const response = {
        exists: false,
        isAvailable: false,
        venue: undefined,
        table: undefined,
        schedules: [] as any[]
      };

      // Find the table and populate venue information
      const table = await Table.findById(tableId).populate('venueId').exec();

      // If table doesn't exist, return the default response
      if (!table) {
        console.log(`Table not found with ID: ${tableId}`);
        res.status(200).json(response);
        return;
      }

      // Update response with table existence
      response.exists = true;
      
      // Check if table is active
      let isAvailable = table.isActive;
      
      // Include table and venue information if table exists
      response.table = {
        _id: table._id,
        number: table.number,
        capacity: table.capacity,
        isOccupied: table.isOccupied,
        isActive: table.isActive
      };

      // Include venue information if available
      if (table.venueId) {
        const venue = table.venueId as any; // Cast to any to access populated fields
        response.venue = {
          _id: venue._id,
          name: venue.name,
          description: venue.description || '',
          restaurantId: venue.restaurantId
        };

        // Check restaurant schedule if table is active
        console.log(`🔍 DEBUG: isAvailable=${isAvailable}, venue.restaurantId=${venue.restaurantId}`);
        console.log(`🔍 DEBUG: Condition result: ${isAvailable && venue.restaurantId}`);
        console.log(`🔍 DEBUG: typeof venue.restaurantId: ${typeof venue.restaurantId}`);
        console.log(`🔍 DEBUG: venue object:`, JSON.stringify(venue, null, 2));
        console.log(`🔍 DEBUG: About to check venue.restaurantId condition...`);
        
        // FORCE schedule check - restaurant schedule takes priority over everything
        if (venue.restaurantId) {
          console.log(`🔍 DEBUG: Inside venue.restaurantId condition!`);
          try {
            console.log(`\n=== RESTAURANT SCHEDULE CHECK ===`);
            console.log(`Checking schedules for restaurant: ${venue.restaurantId}`);
            
            // Find active restaurant schedule
            const restaurantSchedule = await Schedule.findOne({
              scheduleType: 'RESTAURANT',
              restaurantId: venue.restaurantId,
              status: 'ACTIVE',
              isActive: true
            });

            console.log(`Restaurant schedule found:`, restaurantSchedule ? {
              id: restaurantSchedule._id,
              name: restaurantSchedule.name,
              status: restaurantSchedule.status,
              isActive: restaurantSchedule.isActive,
              dailyScheduleLength: restaurantSchedule.dailySchedule?.length
            } : 'None');

            if (restaurantSchedule) {
              // Add restaurant schedule to response
              response.schedules.push({
                _id: restaurantSchedule._id,
                name: restaurantSchedule.name,
                scheduleType: restaurantSchedule.scheduleType,
                dailySchedule: restaurantSchedule.dailySchedule,
                timezone: restaurantSchedule.timezone || 'Asia/Dubai'
              });

              console.log(`Calling isCurrentlyActive() on restaurant schedule...`);
              const isRestaurantOpen = restaurantSchedule.isCurrentlyActive();
              console.log(`Restaurant schedule result: ${isRestaurantOpen}`);
              
              // RESTAURANT SCHEDULE TAKES ABSOLUTE PRIORITY
              if (!isRestaurantOpen) {
                isAvailable = false;
                console.log(`❌ Table ${tableId} not available - RESTAURANT IS CLOSED (priority rule)`);
                // Don't return early - we still want to collect venue schedule for frontend
              } else {
                console.log(`✅ Restaurant is open according to schedule - checking venue schedule`);
              }
            } else {
              // If no active restaurant schedule is found, check if restaurant has any schedules
              console.log(`No active restaurant schedule found, checking for any schedules...`);
              const anyRestaurantSchedule = await Schedule.findOne({
                scheduleType: 'RESTAURANT',
                restaurantId: venue.restaurantId
              });
              
              console.log(`Any restaurant schedule found:`, anyRestaurantSchedule ? {
                id: anyRestaurantSchedule._id,
                name: anyRestaurantSchedule.name,
                status: anyRestaurantSchedule.status,
                isActive: anyRestaurantSchedule.isActive
              } : 'None');
              
              if (anyRestaurantSchedule) {
                // Restaurant has schedules but none are active, so it should be considered closed
                isAvailable = false;
                console.log(`❌ Table ${tableId} not available - restaurant has schedules but none are active`);
              } else {
                console.log(`✅ No restaurant schedules found - assuming always open`);
              }
              // If restaurant has no schedules at all, assume it's always open (default behavior)
            }

            // Also check venue-specific schedule
            const venueSchedule = await Schedule.findOne({
              scheduleType: 'VENUE',
              venueId: venue._id,
              status: 'ACTIVE',
              isActive: true
            });

            if (venueSchedule) {
              // Add venue schedule to response
              response.schedules.push({
                _id: venueSchedule._id,
                name: venueSchedule.name,
                scheduleType: venueSchedule.scheduleType,
                dailySchedule: venueSchedule.dailySchedule,
                timezone: venueSchedule.timezone || 'Asia/Dubai'
              });

              const isVenueOpen = venueSchedule.isCurrentlyActive();
              console.log(`Venue schedule check for ${venue._id}: ${isVenueOpen}`);
              
              // If venue is closed according to schedule, table is not available
              if (!isVenueOpen) {
                isAvailable = false;
                console.log(`Table ${tableId} not available - venue is closed according to schedule`);
              }
            } else {
              // Check if venue has any schedules
              const anyVenueSchedule = await Schedule.findOne({
                scheduleType: 'VENUE',
                venueId: venue._id
              });
              
              if (anyVenueSchedule) {
                // Venue has schedules but none are active, so it should be considered closed
                isAvailable = false;
                console.log(`Table ${tableId} not available - venue has schedules but none are active`);
              }
            }
          } catch (scheduleError) {
            console.error('Error checking restaurant/venue schedule:', scheduleError);
            // Don't fail the entire request due to schedule check error
            // Just log it and continue with table availability
          }
        }
      }
      
      // Set final availability
      response.isAvailable = isAvailable;

      console.log(`Table verification complete for ID: ${tableId}, isAvailable: ${response.isAvailable}`);
      res.status(200).json(response);
    } catch (error) {
      console.error('Error verifying table:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ error: `Error verifying table: ${errorMessage}` });
    }
  }

  /**
   * Get the complete menu hierarchy for a table's venue
   * Returns venue information and menu structure with categories, subcategories, and menu items
   */
  public async getTableMenu(req: Request, res: Response): Promise<void> {
    try {
      const { tableId } = req.params;
      console.log(`Getting menu for table with ID: ${tableId}`);

      if (!mongoose.Types.ObjectId.isValid(tableId)) {
        res.status(400).json({ error: 'Invalid table ID format' });
        return;
      }

      // Find the table and populate venue information
      const table = await Table.findById(tableId);
      if (!table) {
        res.status(404).json({ error: 'Table not found' });
        return;
      }

      // Check if table is active
      if (!table.isActive) {
        res.status(400).json({ error: 'Table is not active' });
        return;
      }

      // Get venue information
      const venue = await Venue.findById(table.venueId);
      if (!venue) {
        res.status(404).json({ error: 'Venue not found for this table' });
        return;
      }

      // Check restaurant and venue schedules before serving menu
      let isRestaurantOpen = true;
      let isVenueOpen = true;

      try {
        // Check restaurant schedule
        if (venue.restaurantId) {
          const restaurantSchedule = await Schedule.findOne({
            scheduleType: 'RESTAURANT',
            restaurantId: venue.restaurantId,
            status: 'ACTIVE',
            isActive: true
          });

          if (restaurantSchedule) {
            isRestaurantOpen = restaurantSchedule.isCurrentlyActive();
            console.log(`Restaurant schedule check for menu access: ${isRestaurantOpen}`);
          } else {
            // Check if restaurant has any schedules
            const anyRestaurantSchedule = await Schedule.findOne({
              scheduleType: 'RESTAURANT',
              restaurantId: venue.restaurantId
            });
            
            if (anyRestaurantSchedule) {
              isRestaurantOpen = false;
              console.log('Restaurant has schedules but none are active - blocking menu access');
            }
          }
        }

        // Check venue schedule
        const venueSchedule = await Schedule.findOne({
          scheduleType: 'VENUE',
          venueId: venue._id,
          status: 'ACTIVE',
          isActive: true
        });

        if (venueSchedule) {
          isVenueOpen = venueSchedule.isCurrentlyActive();
          console.log(`Venue schedule check for menu access: ${isVenueOpen}`);
        } else {
          // Check if venue has any schedules
          const anyVenueSchedule = await Schedule.findOne({
            scheduleType: 'VENUE',
            venueId: venue._id
          });
          
          if (anyVenueSchedule) {
            isVenueOpen = false;
            console.log('Venue has schedules but none are active - blocking menu access');
          }
        }

        // If restaurant or venue is closed, don't serve menu
        if (!isRestaurantOpen || !isVenueOpen) {
          const closureReason = !isRestaurantOpen ? 'restaurant' : 'venue';
          res.status(400).json({ 
            error: `Menu not available - ${closureReason} is currently closed`,
            isRestaurantOpen,
            isVenueOpen
          });
          return;
        }
      } catch (scheduleError) {
        console.error('Error checking schedules for menu access:', scheduleError);
        // Continue serving menu if schedule check fails (fallback behavior)
      }

      // Find menus associated with this venue
      const menus = await Menu.find({ venueId: venue._id });
      if (!menus || menus.length === 0) {
        res.status(404).json({ error: 'No menu found for this venue' });
        return;
      }

      // Use the first menu found (assuming one menu per venue)
      const menu = menus[0];

      // Get categories for this menu
      const categories = await Category.find({
        _id: { $in: menu.categories },
        isActive: true
      }).sort({ order: 1 });

      // Get all subcategories for these categories
      const subcategoriesMap: Record<string, any[]> = {};
      for (const category of categories) {
        const subcategories = await SubCategory.find({
          category: category._id,
          isActive: true
        }).sort({ order: 1 });
        
        subcategoriesMap[category._id.toString()] = subcategories;
      }

      // Get all menu items for this venue
      const menuItems = await MenuItem.find({
        venueId: venue._id,
        isActive: true,
        isAvailable: true
      });

      // Build response structure
      const response = {
        venue: {
          _id: venue._id,
          name: venue.name,
          description: venue.description || ''
        },
        menu: {
          categories: categories.map(cat => ({
            id: cat._id,
            name: cat.name,
            description: cat.description,
            image: cat.image
          })),
          subcategories: Object.entries(subcategoriesMap).reduce((acc, [categoryId, subcategories]) => {
            acc[categoryId] = subcategories.map(subcat => ({
              id: subcat._id,
              name: subcat.name,
              description: subcat.description,
              image: subcat.image
            }));
            return acc;
          }, {} as Record<string, any[]>),
          menuItems: menuItems.map(item => ({
            id: item._id,
            name: item.name,
            description: item.description,
            price: item.price,
            image: item.image,
            categoryId: item.categories.length > 0 ? item.categories[0] : null,
            subcategoryId: item.subCategories.length > 0 ? item.subCategories[0] : null
          }))
        }
      };

      console.log(`Successfully retrieved menu for table ID: ${tableId}`);
      res.status(200).json(response);
    } catch (error) {
      console.error('Error getting table menu:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ error: `Error getting table menu: ${errorMessage}` });
    }
  }
}
