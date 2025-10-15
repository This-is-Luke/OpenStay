import express, { Request, Response } from 'express';
import propertyService from '../services/propertyService';
import { 
  ApiResponse, 
} from '../types';


export const CreatePropertyListing = async (req: Request, res: Response<ApiResponse>) => {
  try {
    const propertyData = req.body;
    const hostId = req.params.hostId;
    const newProperty = await propertyService.createProperty(hostId, propertyData);

    res.status(201).json({
      success: true,
      data: newProperty,
      message: 'Property listing created successfully'
    });
  } catch (error) {
    console.error('Create property listing error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to create property listing',
      error: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    });
  }
}; 
export const GetAllListings = async (req: Request, res: Response<ApiResponse>) => {
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
} };

export const GetPropertyListingByID = async (req: Request, res: Response<ApiResponse>) => {
  try {
    const propertyId = req.params.id;
    const property = await propertyService.getPropertyById(propertyId);
    
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
    return;
  }
};

