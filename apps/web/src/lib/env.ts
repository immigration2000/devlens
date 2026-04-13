/**
 * Environment variable helper with type safety
 */

interface EnvVariables {
  NEXT_PUBLIC_API_URL: string;
  NEXT_PUBLIC_WS_URL: string;
}

const getEnv = (): EnvVariables => {
  return {
    NEXT_PUBLIC_API_URL:
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000",
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:4000",
  };
};

export const env = getEnv();

export default env;
