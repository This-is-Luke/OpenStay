import express, { Request, Response } from 'express';
import authService from '../services/authService';
import { 
  validate, 
  registerSchema, 
  loginSchema, 
  connectWalletSchema, 
  updateProfileSchema 
} from '../middleware/validation';
import { authenticateToken } from '../middleware/auth';
import { 
  ApiResponse, 
  CreateUserRequest, 
  LoginRequest, 
  ConnectWalletRequest, 
  UpdateProfileRequest,
  AuthenticatedRequest 
} from '../types/index';

const router = express.Router();

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', validate(registerSchema), async (req: Request<{}, ApiResponse, CreateUserRequest>, res: Response<ApiResponse>) => {
  try {
    const result = await authService.register(req.body);
    
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: result
    });
  } catch (error) {
    console.error('Registration error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    if (errorMessage.includes('already exists')) {
      res.status(409).json({
        success: false,
        message: errorMessage
      });
      return;
    }
    
    res.status(500).json({
      success: false,
      message: 'Registration failed',
      error: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    });
  }
});

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', validate(loginSchema), async (req: Request<{}, ApiResponse, LoginRequest>, res: Response<ApiResponse>) => {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);
    
    res.json({
      success: true,
      message: 'Login successful',
      data: result
    });
  } catch (error) {
    console.error('Login error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    if (errorMessage.includes('Invalid email or password')) {
      res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
      return;
    }
    
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    });
  }
});

// @route   POST /api/auth/connect-wallet
// @desc    Connect wallet to user account
// @access  Private
router.post('/connect-wallet', authenticateToken, validate(connectWalletSchema), async (req: AuthenticatedRequest<{}, ApiResponse, ConnectWalletRequest>, res: Response<ApiResponse>) => {
  try {
    const result = await authService.connectWallet(req.user.id, req.body);
    
    res.json({
      success: true,
      message: 'Wallet connected successfully',
      data: result
    });
  } catch (error) {
    console.error('Connect wallet error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    if (errorMessage.includes('already connected')) {
      res.status(409).json({
        success: false,
        message: errorMessage
      });
      return;
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to connect wallet',
      error: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    });
  }
});

// @route   POST /api/auth/disconnect-wallet
// @desc    Disconnect wallet from user account
// @access  Private
router.post('/disconnect-wallet', authenticateToken, async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
  try {
    const result = await authService.disconnectWallet(req.user.id);
    
    res.json({
      success: true,
      message: 'Wallet disconnected successfully',
      data: result
    });
  } catch (error) {
    console.error('Disconnect wallet error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    res.status(500).json({
      success: false,
      message: 'Failed to disconnect wallet',
      error: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    });
  }
});

// @route   GET /api/auth/profile
// @desc    Get user profile
// @access  Private
router.get('/profile', authenticateToken, async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
  try {
    const profile = await authService.getProfile(req.user.id);
    
    res.json({
      success: true,
      data: profile
    });
  } catch (error) {
    console.error('Get profile error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    if (errorMessage === 'User not found') {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to get profile',
      error: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    });
  }
});

// @route   PUT /api/auth/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', authenticateToken, validate(updateProfileSchema), async (req: AuthenticatedRequest<{}, ApiResponse, UpdateProfileRequest>, res: Response<ApiResponse>) => {
  try {
    const result = await authService.updateProfile(req.user.id, req.body);
    
    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: result
    });
  } catch (error) {
    console.error('Update profile error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    if (errorMessage === 'User not found') {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
      error: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    });
  }
});

// @route   POST /api/auth/verify-token
// @desc    Verify if token is valid
// @access  Private
router.post('/verify-token', authenticateToken, (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
  res.json({
    success: true,
    message: 'Token is valid',
    data: {
      user: req.user
    }
  });
});

// @route   POST /api/auth/logout
// @desc    Logout user (client-side token removal)
// @access  Private
router.post('/logout', authenticateToken, (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
  // In a stateless JWT system, logout is handled client-side
  // by removing the token from storage
  res.json({
    success: true,
    message: 'Logout successful'
  });
});

export default router;