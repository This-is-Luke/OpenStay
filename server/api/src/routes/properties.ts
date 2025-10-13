import express, { Request, Response } from 'express';
import propertyService from '../services/propertyService';
import { 
  validate, 
  validateQuery,
  createPropertySchema, 
  updatePropertySchema,
  searchPropertiesSchema
} from '../middleware/validation';
import { authenticateUser } from '../middleware/auth';
import { 
  ApiResponse, 
  CreatePropertyRequest, 
  UpdatePropertyRequest, 
  SearchPropertiesRequest,
  AuthenticatedRequest 
} from '../types';

const router = express.Router();

// @route   POST /api/properties
// @desc    Create a new property listing
// @access  Private (Host only)
router.post('/', authenticateUser, validate(createPropertySchema), async (req: AuthenticatedRequest<{}, ApiResponse, CreatePropertyRequest>, res: Response<ApiResponse>) => {
  try {
    const property = await propertyService.createProperty(req.user.id, req.body);
    
    res.status(201).json({
      success: true,
      message: 'Property created successfully',
      data: property
    });
  } catch (error) {
    console.error('Create property error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    res.status(500).json({
      success: false,
      message: 'Failed to create property',
      error: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    });
  }
});

// @route   GET /api/properties
// @desc    Search and browse properties
// @access  Public
router.get('/', validateQuery(searchPropertiesSchema), async (req: Request<{}, ApiResponse, {}, SearchPropertiesRequest>, res: Response<ApiResponse>) => {
  try {
    const result = await propertyService.searchProperties(req.query);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Search properties error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    res.status(500).json({
      success: false,
      message: 'Failed to search properties',
      error: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    });
  }
});

// @route   GET /api/properties/map
// @desc    Get properties for map view with bounds
// @access  Public
router.get('/map', async (req: Request<{}, ApiResponse, {}, { 
  north: string; 
  south: string; 
  east: string; 
  west: string;
  guests?: string;
  minPrice?: string;
  maxPrice?: string;
}>, res: Response<ApiResponse>) => {
  try {
    const { north, south, east, west, guests, minPrice, maxPrice } = req.query;
    
    if (!north || !south || !east || !west) {
      res.status(400).json({
        success: false,
        message: 'Map bounds (north, south, east, west) are required'
      });
      return;
    }

    const bounds = {
      north: parseFloat(north),
      south: parseFloat(south),
      east: parseFloat(east),
      west: parseFloat(west)
    };

    const filters: any = {};
    if (guests) filters.guests = parseInt(guests);
    if (minPrice) filters.minPrice = parseFloat(minPrice);
    if (maxPrice) filters.maxPrice = parseFloat(maxPrice);

    const properties = await propertyService.getPropertiesByLocation(bounds, filters);
    
    res.json({
      success: true,
      data: properties
    });
  } catch (error) {
    console.error('Get map properties error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    res.status(500).json({
      success: false,
      message: 'Failed to get map properties',
      error: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    });
  }
});

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

// @route   GET /api/properties/:id/similar
// @desc    Get similar properties
// @access  Public
router.get('/:id/similar', async (req: Request<{ id: string }, ApiResponse, {}, { limit?: string }>, res: Response<ApiResponse>) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit) : 6;
    const properties = await propertyService.getSimilarProperties(req.params.id, limit);
    
    res.json({
      success: true,
      data: properties
    });
  } catch (error) {
    console.error('Get similar properties error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    res.status(500).json({
      success: false,
      message: 'Failed to get similar properties',
      error: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    });
  }
});

// @route   PUT /api/properties/:id
// @desc    Update property listing
// @access  Private (Host only - own properties)
router.put('/:id', authenticateUser, validate(updatePropertySchema), async (req: AuthenticatedRequest<{ id: string }, ApiResponse, UpdatePropertyRequest>, res: Response<ApiResponse>) => {
  try {
    const property = await propertyService.updateProperty(req.params.id, req.user.id, req.body);
    
    res.json({
      success: true,
      message: 'Property updated successfully',
      data: property
    });
  } catch (error) {
    console.error('Update property error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    if (errorMessage.includes('not found') || errorMessage.includes('unauthorized')) {
      res.status(404).json({
        success: false,
        message: 'Property not found or unauthorized'
      });
      return;
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to update property',
      error: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    });
  }
});

// @route   DELETE /api/properties/:id
// @desc    Delete property listing (soft delete)
// @access  Private (Host only - own properties)
router.delete('/:id', authenticateUser, async (req: AuthenticatedRequest<{ id: string }>, res: Response<ApiResponse>) => {
  try {
    const result = await propertyService.deleteProperty(req.params.id, req.user.id);
    
    res.json({
      success: true,
      message: 'Property deleted successfully',
      data: result
    });
  } catch (error) {
    console.error('Delete property error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    if (errorMessage.includes('not found') || errorMessage.includes('unauthorized')) {
      res.status(404).json({
        success: false,
        message: 'Property not found or unauthorized'
      });
      return;
    }
    
    if (errorMessage.includes('active bookings')) {
      res.status(400).json({
        success: false,
        message: 'Cannot delete property with active bookings'
      });
      return;
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to delete property',
      error: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    });
  }
});

// @route   GET /api/properties/:id/availability
// @desc    Check property availability for specific dates
// @access  Public
router.get('/:id/availability', async (req: Request<{ id: string }, ApiResponse, {}, { checkIn: string; checkOut: string }>, res: Response<ApiResponse>) => {
  try {
    const { checkIn, checkOut } = req.query;
    
    if (!checkIn || !checkOut) {
      res.status(400).json({
        success: false,
        message: 'checkIn and checkOut dates are required'
      });
      return;
    }
    
    const isAvailable = await propertyService.checkAvailability(req.params.id, checkIn, checkOut);
    
    res.json({
      success: true,
      data: {
        propertyId: req.params.id,
        checkIn,
        checkOut,
        isAvailable
      }
    });
  } catch (error) {
    console.error('Check availability error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    res.status(500).json({
      success: false,
      message: 'Failed to check availability',
      error: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    });
  }
});

// @route   GET /api/properties/host/:hostId
// @desc    Get all properties for a specific host
// @access  Public
router.get('/host/:hostId', async (req: Request<{ hostId: string }>, res: Response<ApiResponse>) => {
  try {
    const properties = await propertyService.getHostProperties(req.params.hostId);
    
    res.json({
      success: true,
      data: properties
    });
  } catch (error) {
    console.error('Get host properties error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    res.status(500).json({
      success: false,
      message: 'Failed to get host properties',
      error: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    });
  }
});

// @route   GET /api/properties/my/listings
// @desc    Get current user's properties
// @access  Private (Host only)
router.get('/my/listings', authenticateUser, async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
  try {
    const properties = await propertyService.getHostProperties(req.user.id);
    
    res.json({
      success: true,
      data: properties
    });
  } catch (error) {
    console.error('Get my properties error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    res.status(500).json({
      success: false,
      message: 'Failed to get your properties',
      error: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    });
  }
});


router.get('/listings', authenticateUser, async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
  try {
    const properties = await propertyService.getAllProperties();
    
    res.json({
      success: true,
      data: properties
    });
  } catch (error) {
    console.error('Get my properties error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    res.status(500).json({
      success: false,
      message: 'Failed to get your properties',
      error: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    });
  }
}
);

export default router;