import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { query } from '../database/connection';
import { AuthenticatedRequest, JwtPayload, ApiResponse } from '../types';

// Middleware to verify JWT token
export const authenticateToken = async (
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      res.status(401).json({
        success: false,
        message: 'Access token required'
      });
      return;
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
    
    // Get user from database
    const result = await query<{
      id: string;
      email: string;
      first_name: string;
      last_name: string;
      wallet_address: string | null;
      is_host: boolean;
      is_verified: boolean;
    }>(
      'SELECT id, email, first_name, last_name, wallet_address, is_host, is_verified FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      res.status(401).json({
        success: false,
        message: 'Invalid token - user not found'
      });
      return;
    }

    const user = result.rows[0]!;

    // Add user to request object
    (req as AuthenticatedRequest).user = {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      walletAddress: user.wallet_address || undefined,
      isHost: user.is_host,
      isVerified: user.is_verified
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
      return;
    }
    
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        success: false,
        message: 'Token expired'
      });
      return;
    }

    console.error('Authentication error:', error);
    res.status(500).json({
      success: false,
      message: 'Authentication failed'
    });
  }
};

// Middleware to check if user has wallet connected
export const requireWallet = (
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): void => {
  const authReq = req as AuthenticatedRequest;
  
  if (!authReq.user.walletAddress) {
    res.status(400).json({
      success: false,
      message: 'Wallet connection required for this action'
    });
    return;
  }
  
  next();
};

// Middleware to check if user is a host
export const requireHost = (
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): void => {
  const authReq = req as AuthenticatedRequest;
  
  if (!authReq.user.isHost) {
    res.status(403).json({
      success: false,
      message: 'Host privileges required'
    });
    return;
  }
  
  next();
};

// Middleware to check if user is verified
export const requireVerified = (
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): void => {
  const authReq = req as AuthenticatedRequest;
  
  if (!authReq.user.isVerified) {
    res.status(403).json({
      success: false,
      message: 'Account verification required'
    });
    return;
  }
  
  next();
};

// Optional authentication - doesn't fail if no token
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
      const result = await query<{
        id: string;
        email: string;
        first_name: string;
        last_name: string;
        wallet_address: string | null;
        is_host: boolean;
        is_verified: boolean;
      }>(
        'SELECT id, email, first_name, last_name, wallet_address, is_host, is_verified FROM users WHERE id = $1',
        [decoded.userId]
      );

      if (result.rows.length > 0) {
        const user = result.rows[0]!;
        (req as AuthenticatedRequest).user = {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          walletAddress: user.wallet_address || undefined,
          isHost: user.is_host,
          isVerified: user.is_verified
        };
      }
    }

    next();
  } catch (error) {
    // Continue without authentication if token is invalid
    next();
  }
};