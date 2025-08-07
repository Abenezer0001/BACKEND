import { Request, Response } from 'express';
import Zone, { IZone } from '../models/Zone';

export class ZoneController {
  // Create a new zone
  public async create(req: Request, res: Response): Promise<void> {
    try {
      console.log('Creating new zone with data:', req.body);
      const zoneData = req.body;
      const zone = new Zone(zoneData);
      console.log('Saving zone to database...');
      const savedZone = await zone.save();
      console.log('Zone saved successfully:', savedZone);
      
      res.status(201).json(savedZone);
    } catch (error) {
      console.error('Error creating zone:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ error: `Error creating zone: ${errorMessage}` });
    }
  }

  // Get all zones
  public async getAll(req: Request, res: Response): Promise<void> {
    try {
      const zones = await Zone.find()
        .populate('venueId')
        .populate('tables');
      res.status(200).json(zones);
    } catch (error) {
      console.error('Error fetching zones:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ error: `Error fetching zones: ${errorMessage}` });
    }
  }

  // Get zone by ID
  public async getById(req: Request, res: Response): Promise<void> {
    try {
      const zone = await Zone.findById(req.params.id)
        .populate('venueId')
        .populate('tables');
      if (!zone) {
        res.status(404).json({ error: 'Zone not found' });
        return;
      }
      res.status(200).json(zone);
    } catch (error) {
      console.error('Error fetching zone:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ error: `Error fetching zone: ${errorMessage}` });
    }
  }

  // Update zone
  public async update(req: Request, res: Response): Promise<void> {
    try {
      const zone = await Zone.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true }
      );
      if (!zone) {
        res.status(404).json({ error: 'Zone not found' });
        return;
      }
      res.status(200).json(zone);
    } catch (error) {
      console.error('Error updating zone:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ error: `Error updating zone: ${errorMessage}` });
    }
  }

  // Delete zone
  public async delete(req: Request, res: Response): Promise<void> {
    try {
      const zone = await Zone.findByIdAndDelete(req.params.id);
      if (!zone) {
        res.status(404).json({ error: 'Zone not found' });
        return;
      }
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting zone:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ error: `Error deleting zone: ${errorMessage}` });
    }
  }

  // Get zones by venue
  public async getByVenue(req: Request, res: Response): Promise<void> {
    try {
      const zones = await Zone.find({ venueId: req.params.venueId })
        .populate('tables');
      res.status(200).json(zones);
    } catch (error) {
      console.error('Error fetching zones by venue:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ error: `Error fetching zones by venue: ${errorMessage}` });
    }
  }
}
