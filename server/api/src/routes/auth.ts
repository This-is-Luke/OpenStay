import express, { Request, Response, NextFunction } from 'express';
import { Database } from '../database/supabase';
import { AuthenticatedRequest, ApiResponse } from '../types';
import supabase from '../database/supabase';
const router = express.Router();



router.get('/sign-in', async (req: Request, res: Response<ApiResponse>) => {
  const {email, password} = req.query;
  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required' });
  }
  const { user, session, error } = await supabase.auth.signInWithPassword({
  email: 'example@email.com',
  password: 'example-password',
})
res.status(201).json({
  success: true,
  message: "Successfully signed in",
});
}); 

// @route   POST /api/auth/register
// @desc    Register a new user (Sign-Up)
// @access  Public
router.post('/sign-up', async (req: Request, res: Response<ApiResponse>) => {
  try {

    const { email, password, firstName, lastName } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }
    
    // 1. Call the Supabase SDK sign-up function
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // Pass custom user metadata (first_name, last_name)
        // This is stored in auth.users and needs a database trigger 
        // to populate your `public.users` table automatically.
        data: {
          first_name: firstName,
          last_name: lastName,
        }
      }
    });

    if (error) {
      console.error('Supabase registration error:', error.message);
      // Supabase errors are typically 400 (e.g., duplicate user, weak password)
      return res.status(400).json({ success: false, message: error.message });
    }

    const message = data.session 
      ? 'Registration successful and user automatically logged in.' 
      : 'Registration successful! Please check your email for a verification link.';
      
    res.status(201).json({
      success: true,
      message: message,
      // The Supabase SDK handles session creation, we don't return tokens directly here.
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, message: 'Failed to register user' });
  }
});

// export default router; // Your final export remains at the bottom

export default router;