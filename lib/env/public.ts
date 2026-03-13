const requirePublicEnv = (key: string, value: string | undefined): string => {
  if (!value) {
    throw new Error(`Missing public env var: ${key}`);
  }
  return value;
};

export const publicEnv = {
  NEXT_PUBLIC_SUPABASE_URL: requirePublicEnv(
    "NEXT_PUBLIC_SUPABASE_URL",
    process.env.NEXT_PUBLIC_SUPABASE_URL
  ),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: requirePublicEnv(
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ),
} as const;
