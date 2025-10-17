import { Request } from 'express';

// User Types
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  profileImage?: string;
  walletAddress?: string;
  walletType?: WalletType;
  walletConnectedAt?: Date;
  isHost: boolean;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  walletAddress?: string;
  walletType?: WalletType;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface ConnectWalletRequest {
  walletAddress: string;
  walletType: WalletType;
}

export interface UpdateProfileRequest {
  firstName?: string;
  lastName?: string;
  phone?: string;
  profileImage?: string;
}

// Property Types
export interface Property {
  id: string;
  hostPublicKey:string;
  bump:any; 
  hostId: string;
  title: string;
  description: string;
  propertyType: PropertyType;
  address: string;
  city: string;
  state?: string;
  country: string;
  latitude?: number;
  longitude?: number;
  pricePerNight: number;
  cleaningFee: number;
  serviceFeePercentage: number;
  maxGuests: number;
  bedrooms: number;
  bathrooms: number;
  amenities: string[];
  houseRules: string[];
  images: string[];
  isActive: boolean;
  instantBook: boolean;
  checkInTime: string;
  checkOutTime: string;
  averageRating: number;
  reviewCount: number;
  listingPda: number;
  cancellationPolicy: CancellationPolicy;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePropertyRequest {
  id:number; 
  hostPublicKey:string;
  title: string;
  description: string;
  propertyType: PropertyType;
  address: string;
  city: string;
  state?: string;
  country: string;
  latitude?: number;
  longitude?: number;
  pricePerNight: number;
  cleaningFee?: number;
  maxGuests: number;
  bedrooms?: number;
  bathrooms?: number;
  amenities?: string[];
  houseRules?: string[];
  images: string[];
  instantBook?: boolean;
  checkInTime?: string;
  checkOutTime?: string;
  cancellationPolicy?: CancellationPolicy;
}

export interface UpdatePropertyRequest {
  title?: string;
  description?: string;
  pricePerNight?: number;
  cleaningFee?: number;
  maxGuests?: number;
  amenities?: string[];
  houseRules?: string[];
  images?: string[];
  instantBook?: boolean;
  checkInTime?: string;
  checkOutTime?: string;
  cancellationPolicy?: CancellationPolicy;
  isActive?: boolean;
}

export interface SearchPropertiesRequest {
  city?: string;
  country?: string;
  checkIn?: string;
  checkOut?: string;
  guests?: number;
  minPrice?: number;
  maxPrice?: number;
  propertyType?: PropertyType;
  amenities?: string[];
  instantBook?: boolean;
  page?: number;
  limit?: number;
}

// Enums
export type WalletType = 'phantom' | 'solflare' | 'backpack' | 'sollet';

export type PropertyType = 'apartment' | 'house' | 'room' | 'studio' | 'villa' | 'cabin' | 'other';

export type CancellationPolicy = 'flexible' | 'moderate' | 'strict';

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  errors?: ValidationError[];
}

export interface CreateBookingRequest{
  userId: string;
  propertyId: string;
  checkInDate: string;
  checkOutDate: string;
  guestPublicKey:string;
  listingPda:string;
}

export interface ReserveListingRequest {
     userId: string;
     guestPublicKey:string; 
     listingPda:string
     checkIn: string;
     checkOut: string;
}



export interface SignUpUsers {
  firstName: string;
  lastName: string;
  email: string;
  password: string; 
}


interface ReserveListingParams {
  id: string; // The property ID from the URL like /properties/123
}

export interface ReserveListingResponse 
{
      listingPda: string;
      escrowPda: string;
      host: string;
      price: string;
      programId: string;
      message: string;

}

export interface SignInUsers {
  email: string;
  password: string;

}
export interface ListingRequest {}


export interface ValidationError {
  field: string;
  message: string;
}

export interface PaginationResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface AuthenticatedRequest<P = any, ResBody = any, ReqBody = any, ReqQuery = any> extends Request<P, ResBody, ReqBody, ReqQuery> {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    walletAddress?: string;
    isHost: boolean;
    isVerified: boolean;
  };
}