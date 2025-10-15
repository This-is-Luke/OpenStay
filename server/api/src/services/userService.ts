// services/usersService.ts
import supabase from '../database/supabase';

class UsersService {
  /**
   * Register a new user (Sign Up)
   */
  async signUp(email: string, password: string, firstName?: string, lastName?: string, walletAddress?: string) {
    if (!email || !password) {
      throw new Error('Email and password are required');
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          wallet_address: walletAddress || null,
        },
      },
    });

    if (error) throw new Error(error.message);
    return data;
  }

  /**
   * Sign in an existing user
   */
  async signIn(email: string, password: string) {
    if (!email || !password) {
      throw new Error('Email and password are required');
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw new Error(error.message);
    return data;
  }
}

export default new UsersService();
