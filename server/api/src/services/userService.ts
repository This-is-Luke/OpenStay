// services/usersService.ts
import supabase from '../database/supabase';

class UsersService {
  /**
   * Register a new user (Sign Up)
   */
// Inside your UsersService.ts (Illustrative)

async signUp(email: string, password: string, firstName: string, lastName: string, walletAddress: string) {
  // 1. Create the user in the core authentication system (auth.users)
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    // Note: We don't rely on user_metadata for sync in this approach.
  });

  if (authError) throw new Error(authError.message);

  const authUserId = authData.user?.id;

  // 2. The database trigger (handle_new_user) runs here, creating the basic public.users entry (id, email).

  // 3. Immediately update the public.users table with the remaining custom data
  //    (firstName, lastName, walletAddress) using the user's ID.
  const { data: userData, error: updateError } = await supabase
    .from('users') // Targets the public.users table
    .update({
      first_name: firstName,
      last_name: lastName,
      wallet_address: walletAddress // 🔑 This is the key line
    })
    .eq('id', authUserId)
    .select();

  if (updateError) {
    // IMPORTANT: You should handle cleanup here (e.g., delete the auth user)
    // if the profile update fails, but for simplicity, we focus on the update.
    console.error("Failed to update user profile with wallet address:", updateError.message);
  }

  // Return the sign-in data (which might include the session if auto-login is enabled)
  return authData; 
}
async signIn(email: string, password: string) {
  // Step 1: Sign in via auth service
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) throw new Error(error.message);

  const authUserId = data.user.id;
  
  // Step 2: Query the public.users table for the wallet_address
  const { data: userData, error: userError } = await supabase
    .from('users') 
    .select('*')
    .eq('id', authUserId)
    .single();

  if (userError) {
    // Handle error, maybe log a warning if the profile isn't found
    console.warn("Could not retrieve user's public profile data:", userError);
  }

  // Step 3: Merge and return the complete data object
  return {
    ...data, // Contains user, session, etc.
    user: {
      ...data.user,
      wallet_address: userData ? userData.wallet_address : null,
    },
    session: {
      ...data.session,
      user: {
        ...data.session.user,
        wallet_address: userData ? userData.wallet_address : null,
      }
    }
  };
}
}
export default new UsersService();
