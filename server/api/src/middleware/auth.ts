import { Request, Response, NextFunction } from 'express';
import { Database } from '../database/supabase';
import { AuthenticatedRequest, ApiResponse } from '../types';

// Simple session-based authentication middleware
export const authenticateUser = async (
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.headers['x-user-id'] as string;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'User ID required in headers (x-user-id)'
      });
      return;
    }


    const users = await Database.select<any>('users', 'id, email, first_name, last_name, wallet_address, is_host, is_verified', { id: userId });

    if (users.length === 0) {
      res.status(401).json({
        success: false,
        message: 'Invalid user ID - user not found'
      });
      return;
    }

    const user = users[0];

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
    console.error('Authentication error:', error);
    res.status(500).json({
      success: false,
      message: 'Authentication failed'
    });
  }
};
