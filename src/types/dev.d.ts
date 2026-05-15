declare module 'vitest/config';
declare module 'vitest';
declare module '@playwright/test';

// Allow supabase from generic table names used in migrations
declare module '@supabase/supabase-js' {
  // keep existing types; this file only silences module errors in configs
}
