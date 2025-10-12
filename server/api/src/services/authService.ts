import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query, transaction } from '../database/connection';
import { 
  User, 
  CreateUserRequest, 
  ConnectWalletRequest, 
  UpdateProfileRequest,
  JwtPayload 
} from '../types/index';

class AuthService {
  
  generateToken(userId: string): string {
    return jwt.sign(
      { userId } as JwtPayload,
      process.env.JWT_SECRET!,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
  }

  verifyToken(token: string): JwtPayload {
    return jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
  }

  // Hash password
  async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
  }

  // Compare password
  async comparePassword(password: string, hashedPassword: string): Promise<boolean> {
    return await bcrypt.compare(password, hashedPassword);
  }

  // Register new user
  async register(userData: CreateUserRequest): Promise<{
    user: Omit<User, 'updatedAt'>;
    token: string;
  }> {
    const { email, password, firstName, lastName, phone, walletAddress, walletType } = userData;

    return await transaction(async (client) => {
      // Check if user already exists
      const existingUser = await client.query(
        'SELECT id FROM users WHERE email = $1 OR ($2::text IS NOT NULL AND wallet_address = $2)',
        [email, walletAddress]
      );

      if (existingUser.rows.length > 0) {
        throw new Error('User with this email or wallet already exists');
      }

      // Hash password
      const passwordHash = await this.hashPassword(password);

      // Create user
      const userResult = await client.query<{
        id: string;
        email: string;
        first_name: string;
        last_name: string;
        phone: string | null;
        wallet_address: string | null;
        wallet_type: string | null;
        created_at: Date;
      }>(`
        INSERT INTO users (
          email, password_hash, first_name, last_name, phone, 
          wallet_address, wallet_type, wallet_connected_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, email, first_name, last_name, phone, wallet_address, wallet_type, created_at
      `, [
        email,
        passwordHash,
        firstName,
        lastName,
        phone || null,
        walletAddress || null,
        walletType || null,
        walletAddress ? new Date() : null
      ]);

      const user = userResult.rows[0]!;
      const token = this.generateToken(user.id);

      return {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          phone: user.phone || undefined,
          walletAddress: user.wallet_address || undefined,
          walletType: user.wallet_type as any,
          isHost: false,
          isVerified: false,
          createdAt: user.created_at
        },
        token
      };
    });
  }

  // Login user
  async login(email: string, password: string): Promise<{
    user: Omit<User, 'updatedAt'>;
    token: string;
  }> {
    // Get user by email
    const result = await query<{
      id: string;
      email: string;
      password_hash: string;
      first_name: string;
      last_name: string;
      phone: string | null;
      wallet_address: string | null;
      wallet_type: string | null;
      is_host: boolean;
      is_verified: boolean;
      created_at: Date;
    }>(
      'SELECT id, email, password_hash, first_name, last_name, phone, wallet_address, wallet_type, is_host, is_verified, created_at FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      throw new Error('Invalid email or password');
    }

    const user = result.rows[0]!;

    // Verify password
    const isValidPassword = await this.comparePassword(password, user.password_hash);
    if (!isValidPassword) {
      throw new Error('Invalid email or password');
    }

    // Generate token
    const token = this.generateToken(user.id);

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        phone: user.phone || undefined,
        walletAddress: user.wallet_address || undefined,
        walletType: user.wallet_type as any,
        isHost: user.is_host,
        isVerified: user.is_verified,
        createdAt: user.created_at
      },
      token
    };
  }

  // Connect wallet to existing user
  async connectWallet(
    userId: string, 
    walletData: ConnectWalletRequest
  ): Promise<Omit<User, 'updatedAt'>> {
    const { walletAddress, walletType } = walletData;

    return await transaction(async (client) => {
      // Check if wallet is already connected to another user
      const existingWallet = await client.query(
        'SELECT id FROM users WHERE wallet_address = $1 AND id != $2',
        [walletAddress, userId]
      );

      if (existingWallet.rows.length > 0) {
        throw new Error('This wallet is already connected to another account');
      }

      // Update user with wallet info
      const result = await client.query<{
        id: string;
        email: string;
        first_name: string;
        last_name: string;
        phone: string | null;
        wallet_address: string;
        wallet_type: string;
        is_host: boolean;
        is_verified: boolean;
        created_at: Date;
      }>(`
        UPDATE users 
        SET wallet_address = $1, wallet_type = $2, wallet_connected_at = NOW()
        WHERE id = $3
        RETURNING id, email, first_name, last_name, phone, wallet_address, wallet_type, is_host, is_verified, created_at
      `, [walletAddress, walletType, userId]);

      if (result.rows.length === 0) {
        throw new Error('User not found');
      }

      const user = result.rows[0]!;
      return {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        phone: user.phone || undefined,
        walletAddress: user.wallet_address,
        walletType: user.wallet_type as any,
        isHost: user.is_host,
        isVerified: user.is_verified,
        createdAt: user.created_at
      };
    });
  }

  // Disconnect wallet
  async disconnectWallet(userId: string): Promise<Omit<User, 'updatedAt'>> {
    const result = await query<{
      id: string;
      email: string;
      first_name: string;
      last_name: string;
      phone: string | null;
      is_host: boolean;
      is_verified: boolean;
      created_at: Date;
    }>(`
      UPDATE users 
      SET wallet_address = NULL, wallet_type = NULL, wallet_connected_at = NULL
      WHERE id = $1
      RETURNING id, email, first_name, last_name, phone, is_host, is_verified, created_at
    `, [userId]);

    if (result.rows.length === 0) {
      throw new Error('User not found');
    }

    const user = result.rows[0]!;
    return {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      phone: user.phone || undefined,
      isHost: user.is_host,
      isVerified: user.is_verified,
      createdAt: user.created_at
    };
  }

  // Get user profile
  async getProfile(userId: string): Promise<User> {
    const result = await query<{
      id: string;
      email: string;
      first_name: string;
      last_name: string;
      phone: string | null;
      profile_image: string | null;
      wallet_address: string | null;
      wallet_type: string | null;
      wallet_connected_at: Date | null;
      is_host: boolean;
      is_verified: boolean;
      created_at: Date;
      updated_at: Date;
    }>(`
      SELECT 
        id, email, first_name, last_name, phone, profile_image,
        wallet_address, wallet_type, wallet_connected_at,
        is_host, is_verified, created_at, updated_at
      FROM users 
      WHERE id = $1
    `, [userId]);

    if (result.rows.length === 0) {
      throw new Error('User not found');
    }

    const user = result.rows[0]!;
    return {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      phone: user.phone || undefined,
      profileImage: user.profile_image || undefined,
      walletAddress: user.wallet_address || undefined,
      walletType: user.wallet_type as any,
      walletConnectedAt: user.wallet_connected_at || undefined,
      isHost: user.is_host,
      isVerified: user.is_verified,
      createdAt: user.created_at,
      updatedAt: user.updated_at
    };
  }

  // Update user profile
  async updateProfile(
    userId: string, 
    updateData: UpdateProfileRequest
  ): Promise<Omit<User, 'updatedAt'>> {
    const { firstName, lastName, phone, profileImage } = updateData;
    
    const result = await query<{
      id: string;
      email: string;
      first_name: string;
      last_name: string;
      phone: string | null;
      profile_image: string | null;
      wallet_address: string | null;
      wallet_type: string | null;
      is_host: boolean;
      is_verified: boolean;
      created_at: Date;
    }>(`
      UPDATE users 
      SET 
        first_name = COALESCE($1, first_name),
        last_name = COALESCE($2, last_name),
        phone = COALESCE($3, phone),
        profile_image = COALESCE($4, profile_image),
        updated_at = NOW()
      WHERE id = $5
      RETURNING id, email, first_name, last_name, phone, profile_image, wallet_address, wallet_type, is_host, is_verified, created_at
    `, [firstName, lastName, phone, profileImage, userId]);

    if (result.rows.length === 0) {
      throw new Error('User not found');
    }

    const user = result.rows[0]!;
    return {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      phone: user.phone || undefined,
      profileImage: user.profile_image || undefined,
      walletAddress: user.wallet_address || undefined,
      walletType: user.wallet_type as any,
      isHost: user.is_host,
      isVerified: user.is_verified,
      createdAt: user.created_at
    };
  }
}

export default new AuthService();