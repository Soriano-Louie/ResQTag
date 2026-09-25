export function notFound(req, res, next) {
  res.status(404).json({ message: `API Endpoint Not Found - [${req.method}] ${req.originalUrl}` });
}

export function errorHandler(err, req, res, next) {
  console.error('Unhandled Server Error:', err);

  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode).json({
    message: err.message || 'An unexpected internal server error occurred',
    stack: process.env.NODE_ENV === 'production' ? null : err.stack
  });
}
