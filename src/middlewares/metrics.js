const client = require('prom-client');

// Create a Registry
const register = new client.Registry();

// Add default metrics (CPU, memory, etc.)
client.collectDefaultMetrics({ register });

// Custom metrics
const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register]
});

const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.001, 0.005, 0.015, 0.05, 0.1, 0.2, 0.3, 0.4, 0.5, 1, 2, 5],
  registers: [register]
});

const activeConnections = new client.Gauge({
  name: 'http_active_connections',
  help: 'Number of active HTTP connections',
  registers: [register]
});

// Middleware to track metrics
function metricsMiddleware(req, res, next) {
  // Skip metrics endpoint itself
  if (req.path === '/metrics') {
    return next();
  }

  activeConnections.inc();
  const start = process.hrtime();

  res.on('finish', () => {
    activeConnections.dec();
    const duration = process.hrtime(start);
    const durationSeconds = duration[0] + duration[1] / 1e9;

    // Normalize route for metrics (avoid high cardinality)
    const route = normalizeRoute(req.route?.path || req.path);

    httpRequestsTotal.inc({
      method: req.method,
      route: route,
      status_code: res.statusCode
    });

    httpRequestDuration.observe({
      method: req.method,
      route: route,
      status_code: res.statusCode
    }, durationSeconds);
  });

  next();
}

// Normalize routes to avoid high cardinality
function normalizeRoute(path) {
  return path
    .replace(/\/\d+/g, '/:id')
    .replace(/\/[a-f0-9-]{36}/gi, '/:uuid')
    .replace(/\/[A-Z0-9]{6,}/gi, '/:matricola');
}

// Metrics endpoint handler
async function metricsHandler(req, res) {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (err) {
    res.status(500).end(err.message);
  }
}

module.exports = {
  metricsMiddleware,
  metricsHandler,
  register
};
