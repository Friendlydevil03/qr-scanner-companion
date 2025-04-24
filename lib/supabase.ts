import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

// Replace with your Supabase URL and anon key
const supabaseUrl = 'https://wiandpftwwdhimlfuacu.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndpYW5kcGZ0d3dkaGltbGZ1YWN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU1MjM2ODgsImV4cCI6MjA2MTA5OTY4OH0.pDeL1eVkYJ7XbwVDkXv419Rx71Wx7jNeP6QKh99viGU';

// Custom storage implementation for React Native
const ExpoSecureStoreAdapter = {
  getItem: (key: string) => {
    return SecureStore.getItemAsync(key);
  },
  setItem: (key: string, value: string) => {
    SecureStore.setItemAsync(key, value);
  },
  removeItem: (key: string) => {
    SecureStore.deleteItemAsync(key);
  },
};

// Initialize the Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});