import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { ApiResponse } from '../types';

// Validation middleware for request body
export const validate = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response<ApiResponse>, next: NextFunction): void => {
    const { error } = schema.validate(req.body);
    
    if (error) {
      res.status(400).json({
        success: false,
        message: 'Validation error',
        error: error.details[0].message
      });
      return;
    }
    
    next();
  };
};

// Validation middleware for query parameters
export const validateQuery = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response<ApiResponse>, next: NextFunction): void => {
    const { error } = schema.validate(req.query);
    
    if (error) {
      res.status(400).json({
        success: false,
        message: 'Query validation error',
        error: error.details[0].message
      });
      return;
    }
    
    next();
  };
};

// Property validation schemas
export const createPropertySchema = Joi.object({
  title: Joi.string().required().min(1).max(100),
  description: Joi.string().required().min(10).max(2000),
  price_per_night: Joi.number().required().min(1),
  max_guests: Joi.number().required().min(1).max(20),
  bedrooms: Joi.number().required().min(0).max(20),
  bathrooms: Joi.number().required().min(0).max(20),
  property_type: Joi.string().required().valid('apartment', 'house', 'condo', 'villa', 'cabin', 'other'),
  address: Joi.object({
    street: Joi.string().required(),
    city: Joi.string().required(),
    state: Joi.string().required(),
    country: Joi.string().required(),
    postal_code: Joi.string().required(),
    latitude: Joi.number().required().min(-90).max(90),
    longitude: Joi.number().required().min(-180).max(180)
  }).required(),
  amenities: Joi.array().items(Joi.string()).default([]),
  house_rules: Joi.array().items(Joi.string()).default([]),
  images: Joi.array().items(Joi.string().uri()).min(1).required(),
  availability: Joi.object({
    check_in_time: Joi.string().required(),
    check_out_time: Joi.string().required(),
    min_stay_nights: Joi.number().min(1).default(1),
    max_stay_nights: Joi.number().min(1).default(365)
  }).required()
});

export const updatePropertySchema = Joi.object({
  title: Joi.string().min(1).max(100),
  description: Joi.string().min(10).max(2000),
  price_per_night: Joi.number().min(1),
  max_guests: Joi.number().min(1).max(20),
  bedrooms: Joi.number().min(0).max(20),
  bathrooms: Joi.number().min(0).max(20),
  property_type: Joi.string().valid('apartment', 'house', 'condo', 'villa', 'cabin', 'other'),
  address: Joi.object({
    street: Joi.string(),
    city: Joi.string(),
    state: Joi.string(),
    country: Joi.string(),
    postal_code: Joi.string(),
    latitude: Joi.number().min(-90).max(90),
    longitude: Joi.number().min(-180).max(180)
  }),
  amenities: Joi.array().items(Joi.string()),
  house_rules: Joi.array().items(Joi.string()),
  images: Joi.array().items(Joi.string().uri()).min(1),
  availability: Joi.object({
    check_in_time: Joi.string(),
    check_out_time: Joi.string(),
    min_stay_nights: Joi.number().min(1),
    max_stay_nights: Joi.number().min(1)
  }),
  is_active: Joi.boolean()
});

export const searchPropertiesSchema = Joi.object({
  location: Joi.string(),
  checkIn: Joi.string().isoDate(),
  checkOut: Joi.string().isoDate(),
  guests: Joi.number().min(1).max(20),
  minPrice: Joi.number().min(0),
  maxPrice: Joi.number().min(0),
  propertyType: Joi.string().valid('apartment', 'house', 'condo', 'villa', 'cabin', 'other'),
  amenities: Joi.alternatives().try(
    Joi.string(),
    Joi.array().items(Joi.string())
  ),
  sortBy: Joi.string().valid('price_asc', 'price_desc', 'rating', 'newest'),
  page: Joi.number().min(1).default(1),
  limit: Joi.number().min(1).max(50).default(20)
});