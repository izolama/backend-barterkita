const errorHandler = (err, req, res, next) => {
    console.error(err.stack);
  
    // Firebase Auth errors
    if (err.code && err.code.startsWith('auth/')) {
      return res.status(401).json({
        error: {
          message: err.message,
          code: err.code
        }
      });
    }
  
    // Firestore errors
    if (err.code && err.code.startsWith('firestore/')) {
      return res.status(400).json({
        error: {
          message: err.message,
          code: err.code
        }
      });
    }
  
    // Validation errors
    if (err.name === 'ValidationError') {
      return res.status(400).json({
        error: {
          message: err.message,
          errors: err.errors
        }
      });
    }
  
    // Default error
    res.status(500).json({
      error: {
        message: 'Internal Server Error',
        ...(process.env.NODE_ENV === 'development' && { detail: err.message })
      }
    });
  };
  
  module.exports = errorHandler;
  