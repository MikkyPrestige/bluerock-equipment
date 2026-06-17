import { createClient } from '@supabase/supabase-js'

// This client bypasses RLS — only use in trusted server-side API routes
// NEVER import this file in any component inside /app/components
export const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)