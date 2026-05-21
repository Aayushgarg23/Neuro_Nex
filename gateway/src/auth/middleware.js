/**
 * NeuroNex Gateway — Auth Middleware
 *
 * Validates the NeuroNex-API-Key header on all /api/* requests.
 * In development mode (NODE_ENV !== 'production') a missing key is
 * treated as a warning so local iteration stays frictionless.
 */

const VALID_API_KEYS = new Set(
  (process.env.NEURONEX_API_KEYS || 'dev-key-neuronex-2024')
    .split(',')
    .map(k => k.trim())
    .filter(Boolean)
);

/**
 * authMiddleware — Express middleware factory
 *
 * @param {object} [options]
 * @param {boolean} [options.strict=false] — When true, always enforce auth even in dev mode
 * @returns {import('express').RequestHandler}
 */
export function authMiddleware({ strict = false } = {}) {
  const isDev = process.env.NODE_ENV !== 'production';

  return (req, res, next) => {
    const apiKey = req.headers['neuronex-api-key'] || req.headers['x-api-key'];

    // Health / readiness probes bypass auth
    if (req.path === '/health' || req.path === '/ready') {
      return next();
    }

    if (!apiKey) {
      if (isDev && !strict) {
        // Allow through in dev with a warning header so developers know auth is missing
        res.setHeader('X-Auth-Warning', 'No API key provided — dev mode bypass active');
        console.warn(`[AUTH] ⚠  No API key on ${req.method} ${req.path} (dev bypass active)`);
        return next();
      }
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Missing NeuroNex-API-Key header.',
        code: 'AUTH_KEY_MISSING',
      });
    }

    if (!VALID_API_KEYS.has(apiKey)) {
      console.warn(`[AUTH] ✗  Invalid API key attempt on ${req.method} ${req.path}`);
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Invalid API key.',
        code: 'AUTH_KEY_INVALID',
      });
    }

    // Key is valid — stamp the request with the sanitized key identity and proceed
    req.neuronexKeyId = apiKey.slice(0, 8) + '…';
    console.info(`[AUTH] ✓  Authenticated ${req.method} ${req.path} (key: ${req.neuronexKeyId})`);
    next();
  };
}
