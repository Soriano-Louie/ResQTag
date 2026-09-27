export function notFound(req, res, next) {
  res.status(404).json({ message: `API Endpoint Not Found - [${req.method}] ${req.originalUrl}` });
}

export function errorHandler(err, req, res, next) {
  console.error('Unhandled Server Error:', err);

  const isProd = process.env.NODE_ENV === 'production';
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;

  // Mask database errors in production
  let clientMessage = err.message || 'An unexpected internal server error occurred';
  if (isProd && (err.code?.startsWith('ER_') || err.sql || err.sqlMessage)) {
    clientMessage = 'A database operation error occurred. Please try again later.';
  }

  res.status(statusCode).json({
    message: clientMessage,
    stack: isProd ? null : err.stack
  });
}
