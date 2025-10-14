// routes/authRoutes.ts
import express from 'express';
import { signInUsers, signUpUsers } from '../controllers/usersController';
const router = express.Router();

// @route   GET /api/auth/sign-in
// @desc    Sign in existing user
// @access  Public
router.get('/sign-in', signInUsers);

// @route   POST /api/auth/sign-up
// @desc    Register new user
// @access  Public
router.post('/sign-up', signUpUsers);

export default router;
