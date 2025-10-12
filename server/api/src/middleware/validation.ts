import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';
import { ApiResponse, ValidationError } from '../types';

// User registration validation
export const registerSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required'
  }),
  password: Joi.string()
    .min(8)
    .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\\$%\\^&\\*])'))
    .required()
    .messages({
      'string.min': 'Password must be at least 8 characters long',
      'string.pattern.base': 'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character',
      'any.required': 'Password is required'
    }),
  firstName: Joi.string().min(2).max(50).required().messages({
    'string.min': 'First name must be at least 2 characters long',
    'string.max': 'First name cannot exceed 50 characters',
    'any.required': 'First name is required'
  }),
  lastName: Joi.string().min(2).max(50).required().messages({
    'string.min': 'Last name must be at least 2 characters long',
    'string.max': 'Last name cannot exceed 50 characters',
    'any.required': 'Last name is required'
  }),
  phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).optional().messages({
    'string.pattern.base': 'Please provide a valid phone number'
  }),
  walletAddress: Joi.string().length(44).optional().messages({
    'string.length': 'Wallet address must be exactly 44 characters'
  }),
  walletType: Joi.string().valid('phantom', 'solflare', 'backpack', 'sollet').optional()
});

// User login validation
export const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

// Wallet connection validation
export const connectWalletSchema = Joi.object({
  walletAddress: Joi.string().length(44).required().messages({
    'string.length': 'Wallet address must be exactly 44 characters',
    'any.required': 'Wallet address is required'
  }),
  walletType: Joi.string().valid('phantom', 'solflare', 'backpack', 'sollet').required()
});

// Profile update validation
export const updateProfileSchema = Joi.object({
  firstName: Joi.string().min(2).max(50).optional(),
  lastName: Joi.string().min(2).max(50).optional(),
  phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).optional(),
  profileImage: Joi.string().uri().optional()
});

// Property creation validation
export const createPropertySchema = Joi.object({
  title: Joi.string().min(10).max(255).required().messages({
    'string.min': 'Title must be at least 10 characters long',
    'string.max': 'Title cannot exceed 255 characters'
  }),
  description: Joi.string().min(50).max(2000).required().messages({
    'string.min': 'Description must be at least 50 characters long',
    'string.max': 'Description cannot exceed 2000 characters'
  }),
  propertyType: Joi.string()
    .valid('apartment', 'house', 'room', 'studio', 'villa', 'cabin', 'other')
    .required(),
  address: Joi.string().min(10).max(500).required(),
  city: Joi.string().min(2).max(100).required(),
  state: Joi.string().max(100).optional(),
  country: Joi.string().min(2).max(100).required(),
  latitude: Joi.number().min(-90).max(90).optional(),
  longitude: Joi.number().min(-180).max(180).optional(),
  pricePerNight: Joi.number().positive().precision(2).required().messages({
    'number.positive': 'Price per night must be a positive number'
  }),
  cleaningFee: Joi.number().min(0).precision(2).optional(),
  maxGuests: Joi.number().integer().min(1).max(20).required(),
  bedrooms: Joi.number().integer().min(0).max(20).optional(),
  bathrooms: Joi.number().integer().min(1).max(20).optional(),
  amenities: Joi.array().items(Joi.string()).optional(),
  houseRules: Joi.array().items(Joi.string()).optional(),
  images: Joi.array().items(Joi.string().uri()).min(1).required().messages({
    'array.min': 'At least one image is required'
  }),
  instantBook: Joi.boolean().optional(),
  checkInTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  checkOutTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  cancellationPolicy: Joi.string().valid('flexible', 'moderate', 'strict').optional()
});

// Property update validation
export const updatePropertySchema = Joi.object({
  title: Joi.string().min(10).max(255).optional(),
  description: Joi.string().min(50).max(2000).optional(),
  pricePerNight: Joi.number().positive().precision(2).optional(),
  cleaningFee: Joi.number().min(0).precision(2).optional(),
  maxGuests: Joi.number().integer().min(1).max(20).optional(),
  amenities: Joi.array().items(Joi.string()).optional(),
  houseRules: Joi.array().items(Joi.string()).optional(),
  images: Joi.array().items(Joi.string().uri()).optional(),
  instantBook: Joi.boolean().optional(),
  checkInTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  checkOutTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  cancellationPolicy: Joi.string().valid('flexible', 'moderate', 'strict').optional(),
  isActive: Joi.boolean().optional()
});


// Booking creation validation
export const createBookingSchema = Joi.object({
  propertyId: Joi.string().uuid().required(),
  checkIn: Joi.date().iso().min('now').required(),
  checkOut: Joi.date().iso().greater(Joi.ref('checkIn')).required(),
  guestCount: Joi.number().integer().min(1).required(),
  guestMessage: Joi.string().max(500).optional(),
  specialRequests: Joi.string().max(500).optional()
});

// Review creation validation
export const createReviewSchema = Joi.object({
  bookingId: Joi.string().uuid().required(),
  rating: Joi.number().integer().min(1).max(5).required(),
  title: Joi.string().max(255).optional(),
  comment: Joi.string().max(1000).optional(),
  cleanlinessRating: Joi.number().integer().min(1).max(5).optional(),
  communicationRating: Joi.number().integer().min(1).max(5).optional(),
  locationRating: Joi.number().integer().min(1).max(5).optional(),
  valueRating: Joi.number().integer().min(1).max(5).optional()
});

// Validation middleware factory
export const validate = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response<ApiResponse>, next: NextFunction): void => {
    const { error } = schema.validate(req.body, { abortEarly: false });
    
    if (error) {
      const errors: ValidationError[] = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
      return;
    }
    
    next();
  };
};

// Query parameter validation middleware
export const validateQuery = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response<ApiResponse>, next: NextFunction): void => {
    const { error } = schema.validate(req.query, { abortEarly: false });
    
    if (error) {
      const errors: ValidationError[] = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      
      res.status(400).json({
        success: false,
        message: 'Query validation failed',
        errors
      });
      return;
    }
    
    next();
  };
};

// Property search validation
export const searchPropertiesSchema = Joi.object({
  city: Joi.string().optional(),
  country: Joi.string().optional(),
  checkIn: Joi.date().iso().min('now').optional(),
  checkOut: Joi.date().iso().greater(Joi.ref('checkIn')).optional(),
  guests: Joi.number().integer().min(1).max(20).optional(),
  minPrice: Joi.number().min(0).optional(),
  maxPrice: Joi.number().min(Joi.ref('minPrice')).optional(),
  propertyType: Joi.string()
    .valid('apartment', 'house', 'room', 'studio', 'villa', 'cabin', 'other')
    .optional(),
  amenities: Joi.array().items(Joi.string()).optional(),
  instantBook: Joi.boolean().optional(),
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(50).optional()
});

// Map bounds validation
export const mapBoundsSchema = Joi.object({
  north: Joi.number().min(-90).max(90).required(),
  south: Joi.number().min(-90).max(90).required(),
  east: Joi.number().min(-180).max(180).required(),
  west: Joi.number().min(-180).max(180).required(),
  guests: Joi.number().integer().min(1).max(20).optional(),
  minPrice: Joi.number().min(0).optional(),
  maxPrice: Joi.number().min(Joi.ref('minPrice')).optional()
});

// Availability check validation
export const availabilitySchema = Joi.object({
  checkIn: Joi.date().iso().min('now').required(),
  checkOut: Joi.date().iso().greater(Joi.ref('checkIn')).required()
});