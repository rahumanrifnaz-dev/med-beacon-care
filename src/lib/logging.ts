export function captureError(err: unknown, context?: Record<string, unknown>) {
  // Simple centralized error capture. Replace with Sentry or other provider.
  try {
    // eslint-disable-next-line no-console
    console.error("[captureError]", { err, ...context });
  } catch (e) {
    // ignore
  }

  // Example: if SENTRY_DSN is provided, init and send. Placeholder only.
  // if (import.meta.env.VITE_SENTRY_DSN) {
  //   Sentry.captureException(err);
  // }
}
