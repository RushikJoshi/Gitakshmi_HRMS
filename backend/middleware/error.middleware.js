module.exports = (err, req, res, next) => {
  console.error('Error:', err);

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(e => e.message).join(', ');
    return res.status(400).json({
      success: false,
      error: 'validation_error',
      message: messages || 'Validation failed'
    });
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || 'field';
    return res.status(400).json({
      success: false,
      error: 'duplicate_entry',
      message: `${field} already exists`
    });
  }

  // Custom error with status
  if (err.status) {
    return res.status(err.status).json({
      success: false,
      error: err.error || 'error',
      message: err.message || 'Request failed'
    });
  }

  // Default 500 error
  res.status(500).json({
    success: false,
    error: 'server_error',
    message: err.message || 'Internal server error'
  });
};
