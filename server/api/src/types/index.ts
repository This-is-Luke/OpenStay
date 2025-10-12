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
  cancellationPolicy: CancellationPolicy;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePropertyRequest {
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

// Booking Types
export interface Booking {
  id: string;
  guestId: string;
  propertyId: string;
  checkIn: Date;
  checkOut: Date;
  guestCount: number;
  nights: number;
  pricePerNight: number;
  subtotal: number;
  cleaningFee: number;
  serviceFee: number;
  totalAmount: number;
  status: BookingStatus;
  guestMessage?: string;
  specialRequests?: string;
  escrowAddress?: string;
  transactionSignature?: string;
  paymentToken?: string;
  escrowCreatedAt?: Date;
  fundsReleasedAt?: Date;
  cancelledAt?: Date;
  cancellationReason?: string;
  refundAmount?: number;
  refundTransaction?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateBookingRequest {
  propertyId: string;
  checkIn: string;
  checkOut: string;
  guestCount: number;
  guestMessage?: string;
  specialRequests?: string;
}

export interface BookingCalculation {
  nights: number;
  pricePerNight: number;
  subtotal: number;
  cleaningFee: number;
  serviceFee: number;
  totalAmount: number;
}

// Review Types
export interface Review {
  id: string;
  bookingId: string;
  reviewerId: string;
  revieweeId: string;
  propertyId: string;
  rating: number;
  title?: string;
  comment?: string;
  cleanlinessRating?: number;
  communicationRating?: number;
  locationRating?: number;
  valueRating?: number;
  reviewType: ReviewType;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateReviewRequest {
  bookingId: string;
  rating: number;
  title?: string;
  comment?: string;
  cleanlinessRating?: number;
  communicationRating?: number;
  locationRating?: number;
  valueRating?: number;
}

// Blockchain Types
export interface BlockchainTransaction {
  id: string;
  bookingId: string;
  transactionSignature: string;
  transactionType: TransactionType;
  amount?: number;
  tokenMint?: string;
  fromAddress?: string;
  toAddress?: string;
  escrowAddress?: string;
  status: TransactionStatus;
  blockHeight?: number;
  confirmationCount: number;
  errorMessage?: string;
  retryCount: number;
  createdAt: Date;
  confirmedAt?: Date;
}

// Enums
export type WalletType = 'phantom' | 'solflare' | 'backpack' | 'sollet';

export type PropertyType = 'apartment' | 'house' | 'room' | 'studio' | 'villa' | 'cabin' | 'other';

export type CancellationPolicy = 'flexible' | 'moderate' | 'strict';

export type BookingStatus = 
  | 'pending' 
  | 'payment_required' 
  | 'paid' 
  | 'confirmed' 
  | 'checked_in' 
  | 'completed' 
  | 'cancelled';

export type ReviewType = 'guest_to_host' | 'host_to_guest';

export type TransactionType = 'escrow_create' | 'payment_deposit' | 'funds_release' | 'refund';

export type TransactionStatus = 'pending' | 'confirmed' | 'failed';

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  errors?: ValidationError[];
}

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

// Express Request Extensions
export interface AuthenticatedRequest extends Request {
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

// Database Types
export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
}

// JWT Types
export interface JwtPayload {
  userId: string;
  iat?: number;
  exp?: number;
}

// Solana Types
export interface EscrowAccount {
  guest: string;
  host: string;
  amount: number;
  checkInDate: Date;
  isReleased: boolean;
  bookingId: string;
}

export interface SolanaConfig {
  network: string;
  rpcUrl: string;
  programId: string;
  usdcMint: string;
}