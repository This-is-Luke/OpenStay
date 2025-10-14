// controllers/authController.ts
import { Request, Response } from 'express';
import supabase from '../database/supabase';
import { ApiResponse, SignInUsers } from '../types';

// --- SIGN IN USER ---
export const signInUsers = async (req: Request, res: Response<ApiResponse>) => {
  try {
    const { email, password } = req.query as unknown as SignInUsers;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('Supabase sign-in error:', error.message);
      return res.status(401).json({ success: false, message: error.message });
    }

    res.status(200).json({
      success: true,
      message: 'Successfully signed in',
      data, // optional: you can remove this if you don’t want to expose session info
    });
  } catch (err) {
    console.error('Sign-in error:', err);
    res.status(500).json({ success: false, message: 'Server error during sign-in' });
  }
};

// --- SIGN UP USER ---
export const signUpUsers = async (req: Request, res: Response<ApiResponse>) => {
  try {
    const { email, password, firstName, lastName } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
        },
      },
    });

    if (error) {
      console.error('Supabase registration error:', error.message);
      return res.status(400).json({ success: false, message: error.message });
    }

    const message = data.session
      ? 'Registration successful and user automatically logged in.'
      : 'Registration successful! Please check your email for a verification link.';

    res.status(201).json({
      success: true,
      message,
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, message: 'Failed to register user' });
  }
};
