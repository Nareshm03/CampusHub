const responseFormatter = (req, res, next) => {
  res.success = (data, message = 'Success', statusCode = 200) => {
    res.status(statusCode).json({
      success: true,
      message,
      data,
      timestamp: new Date().toISOString(),
      version: req.apiVersion || 'v1'
    });
  };

  res.error = (message = 'Error', statusCode = 500, details = null) => {
    res.status(statusCode).json({
      success: false,
      error: message,
      ...(details && { details }),
      timestamp: new Date().toISOString(),
      version: req.apiVersion || 'v1'
    });
  };

  res.paginated = (data, pagination, message = 'Success') => {
    res.status(200).json({
      success: true,
      message,
      data,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total: pagination.total,
        pages: Math.ceil(pagination.total / pagination.limit)
      },
      timestamp: new Date().toISOString(),
      version: req.apiVersion || 'v1'
    });
  };

  next();
};

module.exports = responseFormatter;