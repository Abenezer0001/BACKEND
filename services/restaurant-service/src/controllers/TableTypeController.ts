import { Request, Response } from 'express';
import TableType, { ITableType } from '../models/TableType';
import mongoose from 'mongoose';

export const createTableType = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, description, restaurantId } = req.body;
    if (!name || !restaurantId) {
      res.status(400).json({ message: 'Name and restaurantId are required.' });
      return;
    }
    if (!mongoose.Types.ObjectId.isValid(restaurantId)) {
        res.status(400).json({ message: 'Invalid Restaurant ID format.' });
        return;
    }

    const newTableType = new TableType({ name, description, restaurantId });
    await newTableType.save();
    res.status(201).json(newTableType);
  } catch (error: any) {
    res.status(500).json({ message: 'Error creating table type', error: error.message });
  }
};

export const getTableTypesByRestaurant = async (req: Request, res: Response): Promise<void> => {
  try {
    const { restaurantId } = req.params;
     if (!mongoose.Types.ObjectId.isValid(restaurantId)) {
        res.status(400).json({ message: 'Invalid Restaurant ID format.' });
        return;
    }
    const tableTypes = await TableType.find({ restaurantId });
    if (!tableTypes) {
      res.status(404).json({ message: 'No table types found for this restaurant.' });
      return;
    }
    res.status(200).json(tableTypes);
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching table types', error: error.message });
  }
};

export const getTableTypeById = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            res.status(400).json({ message: 'Invalid TableType ID format.' });
            return;
        }
        const tableType = await TableType.findById(id);
        if (!tableType) {
            res.status(404).json({ message: 'TableType not found.' });
            return;
        }
        res.status(200).json(tableType);
    } catch (error: any) {
        res.status(500).json({ message: 'Error fetching table type', error: error.message });
    }
};

export const updateTableType = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({ message: 'Invalid TableType ID format.' });
        return;
    }

    const updatedTableType = await TableType.findByIdAndUpdate(
      id,
      { name, description },
      { new: true, runValidators: true } // Return the updated object and run schema validators
    );

    if (!updatedTableType) {
      res.status(404).json({ message: 'TableType not found.' });
      return;
    }
    res.status(200).json(updatedTableType);
  } catch (error: any) {
    res.status(500).json({ message: 'Error updating table type', error: error.message });
  }
};

export const deleteTableType = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({ message: 'Invalid TableType ID format.' });
        return;
    }

    // Optional: Check if any Table uses this TableType before deleting
    // const tablesUsingType = await Table.countDocuments({ tableTypeId: id });
    // if (tablesUsingType > 0) {
    //   return res.status(400).json({ message: 'Cannot delete TableType as it is currently assigned to tables.' });
    // }

    const deletedTableType = await TableType.findByIdAndDelete(id);
    if (!deletedTableType) {
      res.status(404).json({ message: 'TableType not found.' });
      return;
    }
    res.status(200).json({ message: 'TableType deleted successfully.' });
  } catch (error: any) {
    res.status(500).json({ message: 'Error deleting table type', error: error.message });
  }
};
