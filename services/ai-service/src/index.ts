import { Router } from 'express';
import chatRoutes from './routes/chatRoutes';
import aiMenuRoutes from './routes/aiMenuRoutes';
import VectorSearchService from './services/VectorSearchService';

const router = Router();

// Register routes
router.use('/chat', chatRoutes);
router.use('/menu', aiMenuRoutes);

// Health check for AI service
router.get('/health', (req, res) => {
  const stats = VectorSearchService.getStats();
  res.json({
    status: 'OK',
    service: 'AI Service',
    vectorStats: stats,
    timestamp: new Date().toISOString()
  });
});

// Export a function to initialize the AI service after database is ready
export const initializeAIService = async () => {
  try {
    console.log('AI Service: Initializing vector search...');
    await VectorSearchService.initialize();
    console.log('AI Service: Vector search initialized successfully');
    return true;
  } catch (error) {
    console.error('AI Service: Failed to initialize vector search:', error);
    throw error;
  }
};

export default router; 