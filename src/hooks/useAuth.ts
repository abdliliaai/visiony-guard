import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type UserProfile = Database['public']['Tables']['vy_user_profile']['Row'];

export const useAuthHook = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    let fetchingProfile = false;

    const fetchProfile = async (userId: string) => {
      if (fetchingProfile) return;
      fetchingProfile = true;
      
      try {
        const { data: profileData, error } = await supabase
          .from('vy_user_profile')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();
        
        if (isMounted) {
          if (error && error.code !== 'PGRST116') {
            console.error('Error fetching user profile:', error);
          }
          setProfile(profileData as UserProfile);
          setLoading(false);
        }
      } catch (err) {
        console.error('Profile fetch error:', err);
        if (isMounted) {
          setProfile(null);
          setLoading(false);
        }
      } finally {
        fetchingProfile = false;
      }
    };

    // Set up auth state listener  
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;
        
        console.log('Auth state changed:', event, session?.user?.email);
        
        // Handle session refresh failures
        if (event === 'TOKEN_REFRESHED' && !session) {
          console.log('Token refresh failed, signing out');
          await supabase.auth.signOut();
          return;
        }
        
        setSession(session);
        setUser(session?.user ?? null);
        
        // Fetch profile when user signs in
        if (session?.user && event === 'SIGNED_IN') {
          setTimeout(() => {
            if (isMounted) fetchProfile(session.user.id);
          }, 100);
        } else if (!session?.user) {
          setProfile(null);
        }
        
        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (!isMounted) return;
      
      if (error) {
        console.error('Session error:', error);
        setLoading(false);
        return;
      }
      
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out:', error);
    }
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  };

  const signUp = async (email: string, password: string, metadata?: { 
    firstName?: string; 
    lastName?: string; 
    inviteToken?: string;
  }) => {
    // Use the auth-signup edge function for enhanced signup
    const { data, error } = await supabase.functions.invoke('auth-signup', {
      body: {
        email,
        password,
        firstName: metadata?.firstName,
        lastName: metadata?.lastName,
        inviteToken: metadata?.inviteToken,
      },
    });

    if (error) {
      return { data: null, error };
    }

    // Now sign in the user
    return await signIn(email, password);
  };

  return {
    user,
    session,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
    isAuthenticated: !!user,
    isAdmin: profile?.role === 'root_admin' || profile?.role === 'tenant_admin',
    isRootAdmin: profile?.role === 'root_admin',
    isManagedServicesMode: profile?.managed_services_mode || false,
  };
};