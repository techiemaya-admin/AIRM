/**
 * Error Handler Middleware
 * Centralized error handling for Express
 */

/**
 * Global error handler middleware
 */
export function errorHandler(err, req, res, next) {
  console.error('Error:', err);
  
  // Validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation error',
      message: err.message,
    });
  }

  // Unauthorized errors
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid token',
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Invalid token',
      message: 'Token is malformed',
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: 'Token expired',
      message: 'Please login again',
    });
  }

  // Default error response
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}
/* =====================
   FRONTEND (LAST)
===================== */

const frontendDistPath = path.resolve(__dirname, '../../frontend/dist');

if (fs.existsSync(frontendDistPath)) {
  console.log('🌐 Serving frontend from', frontendDistPath);

  app.use(express.static(frontendDistPath));

  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
} else {
  console.log('⚠️ frontend/dist not found');
}


