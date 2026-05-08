const apiVersioning = (req, res, next) => {
  const version = req.headers['api-version'] || 'v1';
  req.apiVersion = version;
  
  if (!['v1'].includes(version)) {
    return res.status(400).json({
      success: false,
      error: 'Unsupported API version',
      supportedVersions: ['v1']
    });
  }
  
  next();
};

module.exports = apiVersioning;