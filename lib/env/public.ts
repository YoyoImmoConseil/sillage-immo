const requirePublicEnv = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing public env var: ${key}`);
  }
  return value;
};

export const publicEnv = {
  NEXT_PUBLIC_SUPABASE_URL: requirePublicEnv("NEXT_PUBLIC_SUPABASE_URL"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: requirePublicEnv(
    "NEXT_PUBLIC_SUPABASE_ANON_KEY"
  ),
} as const;
