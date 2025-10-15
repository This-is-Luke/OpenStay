import { Request, Response } from 'express';
import { ApiResponse } from '../types';
import UsersService from '../services/userService';

export const signUpUsers = async (req: Request, res: Response<ApiResponse>) => {
  try {
    const { email, password, firstName, lastName , walletAddress} = req.body;

    const data = await UsersService.signUp(email, password, firstName, lastName, walletAddress);

    const message = data.session
      ? 'Registration successful and user automatically logged in.'
      : 'Registration successful! Please check your email for a verification link.';

    res.status(201).json({ success: true, message });
  } catch (error: any) {
    console.error('Registration error:', error.message);
    res.status(400).json({ success: false, message: error.message });
  }
};

export const signInUsers = async (req: Request, res: Response<ApiResponse>) => {
  try {
    const { email, password } = req.query as { email: string; password: string };
    const data = await UsersService.signIn(email, password);
    res.status(200).json({ success: true, message: 'Successfully signed in', data });
  } catch (error: any) {
    console.error('Sign-in error:', error.message);
    res.status(401).json({ success: false, message: error.message });
  }
};
