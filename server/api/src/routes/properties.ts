import express, { Request, Response } from 'express';
import propertyService from '../services/propertyService';
import { 
  ApiResponse, 
  CreatePropertyRequest, 
  UpdatePropertyRequest, 
  SearchPropertiesRequest,
  AuthenticatedRequest 
} from '../types';

const router = express.Router();



router.get('/listings', async (req:Request, res: Response<ApiResponse>) => {
  try 
  { var properties = propertyService.getAllProperties(); 
    res.json({
      success: true,
      data: properties
    });
  } catch (error) {
    console.error('Get properties error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    res.status(500).json({
      success: false,
      message: 'Failed to get properties',
      error: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    });
  }

// @route   GET /api/properties/:id
// @desc    Get property details by ID
// @access  Public (with optional auth for ownership check)
router.get('/listings/:id', async (req: Request<{ id: string }>, res: Response<ApiResponse>) => {
  try {
    const userId = (req as AuthenticatedRequest).user?.id;
    const property = await propertyService.getPropertyById(req.params.id, userId);
    
    res.json({
      success: true,
      data: property
    });
  } catch (error) {
    console.error('Get property error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    if (errorMessage === 'Property not found') {
      res.status(404).json({
        success: false,
        message: 'Property not found'
      });
      return;
    }
    res.status(500).json({
      success: false,
      message: 'Failed to get property',
      error: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    });
  }
});







export default router;