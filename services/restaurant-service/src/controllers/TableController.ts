import { Request, Response } from 'express';
import Restaurant from '../models/Restaurant';
import Table, { ITable } from '../models/Table';
import * as QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
import mongoose from 'mongoose';

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
      if (!tableData.number || !tableData.capacity || !tableData.type) {
        res.status(400).json({ error: 'Missing required fields: number, capacity, or type' });
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

      // Create a new table document
      const newTable = new Table({
        number: tableData.number,
        capacity: parseInt(tableData.capacity, 10),
        type: tableData.type,
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

  // Get all tables
  public async getAll(req: Request, res: Response): Promise<void> {
    try {
      const { restaurantId, venueId } = req.params;
      
      // First check if restaurant exists
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
      
      // Query tables directly by venueId
      const tables = await Table.find({ venueId: new mongoose.Types.ObjectId(venueId) });
      
      res.json(tables);
    } catch (error) {
      console.error('Error getting tables:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ error: `Error getting tables: ${errorMessage}` });
    }
  }

  // Get table by ID
  public async getById(req: Request, res: Response): Promise<void> {
    try {
      const { restaurantId, tableId } = req.params;
      
      // Check if restaurant exists and contains this table ID
      const restaurant = await Restaurant.findOne({
        _id: restaurantId,
        tables: { $in: [tableId] }
      });
      
      if (!restaurant) {
        res.status(404).json({ error: 'Restaurant or table not found' });
        return;
      }

      // Get the table from the Table collection
      const table = await Table.findById(tableId);
      if (!table) {
        res.status(404).json({ error: 'Table not found' });
        return;
      }

      res.json(table);
    } catch (error) {
      console.error('Error getting table:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ error: `Error getting table: ${errorMessage}` });
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

      // Update the table document
      const updatedTable = await Table.findByIdAndUpdate(
        tableId,
        { ...updateData },
        { new: true, runValidators: true }
      );

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

      // Check if restaurant exists
      const restaurant = await Restaurant.findById(restaurantId);
      if (!restaurant) {
        res.status(404).json({ error: 'Restaurant not found' });
        return;
      }

      // Check if table exists
      const table = await Table.findById(tableId);
      if (!table) {
        res.status(404).json({ error: 'Table not found' });
        return;
      }

      // Remove the table ID from the restaurant's tables array
      await Restaurant.updateOne(
        { _id: restaurantId },
        { $pull: { tables: tableId } }
      );

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
      const { restaurantId, tableId } = req.params;

      // Check if restaurant exists and contains this table ID
      const restaurant = await Restaurant.findOne({
        _id: restaurantId,
        tables: { $in: [tableId] }
      });
      
      if (!restaurant) {
        res.status(404).json({ error: 'Restaurant or table not found' });
        return;
      }

      // Find the table in the Table collection
      const table = await Table.findById(tableId);
      if (!table) {
        res.status(404).json({ error: 'Table not found' });
        return;
      }

      // Generate a unique identifier for the QR code
      const qrData = {
        restaurantId,
        tableId,
        uniqueId: uuidv4()
      };

      // Generate QR code
      const qrCode = await QRCode.toDataURL(JSON.stringify(qrData));

      // Update the table with the QR code
      table.qrCode = qrCode;
      await table.save();

      res.json({ qrCode });
    } catch (error) {
      console.error('Error generating QR code:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ error: `Error generating QR code: ${errorMessage}` });
    }
  }

  // Get QR code for a table
  public async getQRCode(req: Request, res: Response): Promise<void> {
    try {
      const { restaurantId, tableId } = req.params;

      // Check if restaurant exists and contains this table ID
      const restaurant = await Restaurant.findOne({
        _id: restaurantId,
        tables: { $in: [tableId] }
      });
      
      if (!restaurant) {
        res.status(404).json({ error: 'Restaurant or table not found' });
        return;
      }

      // Find the table in the Table collection
      const table = await Table.findById(tableId);
      if (!table) {
        res.status(404).json({ error: 'Table not found' });
        return;
      }

      if (!table.qrCode) {
        res.status(404).json({ error: 'QR code not found for this table' });
        return;
      }

      res.json({ qrCode: table.qrCode });
    } catch (error) {
      console.error('Error getting QR code:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ error: `Error getting QR code: ${errorMessage}` });
    }
  }

  // Delete QR code for a table
  public async deleteQRCode(req: Request, res: Response): Promise<void> {
    try {
      const { restaurantId, tableId } = req.params;

      // Check if restaurant exists and contains this table ID
      const restaurant = await Restaurant.findOne({
        _id: restaurantId,
        tables: { $in: [tableId] }
      });
      
      if (!restaurant) {
        res.status(404).json({ error: 'Restaurant or table not found' });
        return;
      }

      // Find the table in the Table collection
      const table = await Table.findById(tableId);
      if (!table) {
        res.status(404).json({ error: 'Table not found' });
        return;
      }

      // Remove the QR code
      table.qrCode = '';
      await table.save();

      res.status(204).send();
    } catch (error) {
      console.error('Error deleting QR code:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ error: `Error deleting QR code: ${errorMessage}` });
    }
  }
}
