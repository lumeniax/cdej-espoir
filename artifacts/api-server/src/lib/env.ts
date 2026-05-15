export function validateEnv(): void {
  const isProd = process.env.NODE_ENV === "production";

  const required = ["DATABASE_URL", "JWT_SECRET", "REFRESH_SECRET", "SESSION_SECRET"];
  if (isProd) {
    required.push("FRONTEND_URL");
  }

  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}. ` +
        `Check your .env file or environment configuration.`,
    );
  }

  const jwtSecret = process.env.JWT_SECRET!;
  if (jwtSecret.length < 32) {
    throw new Error("JWT_SECRET must be at least 32 characters long");
  }

  const refreshSecret = process.env.REFRESH_SECRET!;
  if (refreshSecret.length < 32) {
    throw new Error("REFRESH_SECRET must be at least 32 characters long");
  }
}
