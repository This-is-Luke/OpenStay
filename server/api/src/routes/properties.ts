import express, { Request, Response } from 'express';
import propertyService from '../services/propertyService';
import { GetAllListings, GetPropertyListingByID, CreatePropertyListing } from '../controllers/propertiesController';
const router = express.Router();







// @route   POST /api/listing
// @desc    Creates a new property listing
// @access  Hosts only
router.post('/listing/:hostId', CreatePropertyListing);


// @route   GET /api/listings
// @desc    Gets all property listings
// @access  Guests only
router.get('/listings', GetAllListings);

// @route   GET /api/properties/:id
// @desc    Get property details by ID
// @access  Public (with optional auth for ownership check)
router.get('/listings/:id', GetPropertyListingByID);  
  






export default router;