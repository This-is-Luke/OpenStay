import express, { Request, Response, NextFunction } from 'express';
import { Database } from '../database/supabase';
import { AuthenticatedRequest, ApiResponse } from '../types';

const router = express.Router();

// Simple session-based authentication middleware
export const authenticateUser = async (
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    // Check for user ID in headers
    const userId = req.headers['x-user-id'] as string;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'User ID required in headers (x-user-id)'
      });
      return;
    }

    // Get user from Supabase
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

// Optional authentication - doesn't fail if no user ID
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.headers['x-user-id'] as string;

    if (userId) {
      const users = await Database.select<any>('users', 'id, email, first_name, last_name, wallet_address, is_host, is_verified', { id: userId });

      if (users.length > 0) {
        const user = users[0];
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
    // Continue without authentication if there's an error
    next();
  }
};

// AUTH ROUTES - These work with Supabase Auth

// @route   POST /api/auth/connect-wallet
// @desc    Connect Solana wallet to user account
// @access  Private
router.post('/connect-wallet', authenticateUser, async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
  try {
    const { walletAddress } = req.body;

    if (!walletAddress) {
      res.status(400).json({
        success: false,
        message: 'Wallet address is required'
      });
      return;
    }

    // Update user with wallet address
    await Database.update('users', { wallet_address: walletAddress }, { id: req.user.id });

    res.json({
      success: true,
      message: 'Wallet connected successfully',
      data: { walletAddress }
    });
  } catch (error) {
    console.error('Connect wallet error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to connect wallet'
    });
  }
});

// @route   POST /api/auth/disconnect-wallet
// @desc    Disconnect wallet from user account
// @access  Private
router.post('/disconnect-wallet', authenticateUser, async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
  try {
    // Remove wallet address from user
    await Database.update('users', { wallet_address: null }, { id: req.user.id });

    res.json({
      success: true,
      message: 'Wallet disconnected successfully'
    });
  } catch (error) {
    console.error('Disconnect wallet error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to disconnect wallet'
    });
  }
});

// @route   GET /api/auth/profile
// @desc    Get user profile
// @access  Private
router.get('/profile', authenticateUser, async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
  try {
    res.json({
      success: true,
      data: req.user
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get profile'
    });
  }
});

// @route   PUT /api/auth/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', authenticateUser, async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
  try {
    const { firstName, lastName, isHost } = req.body;

    const updateData: any = {};
    if (firstName) updateData.first_name = firstName;
    if (lastName) updateData.last_name = lastName;
    if (typeof isHost === 'boolean') updateData.is_host = isHost;

    if (Object.keys(updateData).length === 0) {
      res.status(400).json({
        success: false,
        message: 'No valid fields to update'
      });
      return;
    }

    await Database.update('users', updateData, { id: req.user.id });

    // Get updated user data
    const users = await Database.select<any>('users', 'id, email, first_name, last_name, wallet_address, is_host, is_verified', { id: req.user.id });
    const updatedUser = users[0];

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.first_name,
        lastName: updatedUser.last_name,
        walletAddress: updatedUser.wallet_address,
        isHost: updatedUser.is_host,
        isVerified: updatedUser.is_verified
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile'
    });
  }
});

// @route   POST /api/auth/verify-token
// @desc    Verify user token/session (works with Supabase auth)
// @access  Private
router.post('/verify-token', authenticateUser, async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
  try {
    res.json({
      success: true,
      message: 'Token is valid',
      data: req.user
    });
  } catch (error) {
    console.error('Verify token error:', error);
    res.status(500).json({
      success: false,
      message: 'Token verification failed'
    });
  }
});

// @route   GET /api/auth/status
// @desc    Get authentication status
// @access  Public
router.get('/status', (req: Request, res: Response<ApiResponse>) => {
  try {
    res.json({
      success: true,
      message: 'Authentication service is running',
      data: {
        authProvider: 'Supabase',
        endpoints: {
          'POST /connect-wallet': 'Connect Solana wallet',
          'POST /disconnect-wallet': 'Disconnect wallet',
          'GET /profile': 'Get user profile',
          'PUT /profile': 'Update user profile',
          'POST /verify-token': 'Verify user session'
        }
      }
    });
  } catch (error) {
    console.error('Auth status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get auth status'
    });
  }
});

export default router;