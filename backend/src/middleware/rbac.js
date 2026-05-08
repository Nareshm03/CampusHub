const { rolePermissions, attributePolicies, specialPermissions, RESOURCES, ACTIONS } = require('../config/permissions');

/**
 * Check if user has permission based on RBAC
 * @param {string} role - User role
 * @param {string} resource - Resource being accessed
 * @param {string} action - Action being performed
 * @returns {boolean}
 */
const hasRolePermission = (role, resource, action) => {
  // Super admin has all permissions
  if (role === 'SUPERADMIN') return true;
  
  const permissions = rolePermissions[role];
  if (!permissions) return false;
  
  const resourcePermissions = permissions[resource];
  if (!resourcePermissions) return false;
  
  return resourcePermissions.includes(action);
};

/**
 * Check if user passes attribute-based policies (ABAC)
 * @param {Object} user - User object
 * @param {string} resource - Resource type
 * @param {string} action - Action being performed
 * @param {Object} resourceData - The actual resource data
 * @param {Object} context - Additional context
 * @returns {boolean}
 */
const checkAttributePolicy = (user, resource, action, resourceData = null, context = {}) => {
  // Find applicable policies
  const applicablePolicies = Object.values(attributePolicies).filter(policy => {
    const resourceMatch = policy.resource === '*' || 
                         policy.resource === resource ||
                         (Array.isArray(policy.resource) && policy.resource.includes(resource));
    
    const actionMatch = policy.action === '*' ||
                       policy.action === action ||
                       (Array.isArray(policy.action) && policy.action.includes(action));
    
    return resourceMatch && actionMatch;
  });
  
  // If no policies apply, allow (default to RBAC)
  if (applicablePolicies.length === 0) return true;
  
  // All applicable policies must pass
  return applicablePolicies.every(policy => 
    policy.condition(user, resourceData, context)
  );
};

/**
 * Main RBAC middleware
 * Usage: requirePermission(RESOURCES.STUDENT, ACTIONS.CREATE)
 */
const requirePermission = (resource, action) => {
  return async (req, res, next) => {
    try {
      const user = req.user;
      
      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }
      
      // Check RBAC first
      const hasPermission = hasRolePermission(user.role, resource, action);
      
      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          error: 'Permission denied',
          message: `You don't have permission to ${action} ${resource}`
        });
      }
      
      // Store permission context for later ABAC checks
      req.permissionContext = {
        resource,
        action,
        user: {
          id: user._id.toString(),
          role: user.role,
          institution: user.institution
        }
      };
      
      next();
    } catch (error) {
      console.error('Permission check error:', error);
      res.status(500).json({
        success: false,
        error: 'Error checking permissions'
      });
    }
  };
};

/**
 * ABAC middleware for resource-level access control
 * Use this after fetching the resource
 * Usage: checkResourceAccess(resourceData, context)
 */
const checkResourceAccess = (resourceData, context = {}) => {
  return (req, res, next) => {
    const { resource, action, user } = req.permissionContext || {};
    
    if (!resource || !action || !user) {
      return res.status(500).json({
        success: false,
        error: 'Permission context not found. Use requirePermission middleware first.'
      });
    }
    
    // Check attribute-based policies
    const hasAccess = checkAttributePolicy(
      user,
      resource,
      action,
      resourceData,
      context
    );
    
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        message: 'You don\'t have access to this specific resource'
      });
    }
    
    next();
  };
};

/**
 * Helper to check if user can access specific resource
 * Use this in controllers for inline checks
 */
const canAccessResource = (user, resource, action, resourceData, context = {}) => {
  // Check RBAC
  const hasPermission = hasRolePermission(user.role, resource, action);
  if (!hasPermission) return false;
  
  // Check ABAC
  return checkAttributePolicy(
    {
      id: user._id.toString(),
      role: user.role,
      institution: user.institution
    },
    resource,
    action,
    resourceData,
    context
  );
};

/**
 * Middleware to check ownership of resource
 * Ensures user can only access their own resources
 */
const checkOwnership = (resourceField = 'userId') => {
  return (req, res, next) => {
    const user = req.user;
    const resourceId = req.params.id;
    
    // Admin and Faculty bypass ownership for certain operations
    if (user.role === 'ADMIN' || user.role === 'SUPERADMIN') {
      return next();
    }
    
    // Check if accessing own resource
    if (req[resourceField] && req[resourceField].toString() !== user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        message: 'You can only access your own resources'
      });
    }
    
    next();
  };
};

/**
 * Middleware to filter query results based on user permissions
 * Automatically adds filters for students to see only their data
 */
const applyPermissionFilter = (model) => {
  return (req, res, next) => {
    const user = req.user;
    
    // Apply filters based on role
    if (user.role === 'STUDENT') {
      req.query.student = user._id;
    } else if (user.role === 'FACULTY') {
      // Faculty see data scoped to their assigned subjects
      req.query.faculty = user._id;
    }
    
    // Apply institution filter for multi-tenancy
    if (user.institution) {
      req.query.institution = user.institution;
    }
    
    next();
  };
};

/**
 * Check if user has any of the specified roles
 */
const hasAnyRole = (...roles) => {
  return (req, res, next) => {
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }
    
    if (!roles.includes(user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        message: `This action requires one of these roles: ${roles.join(', ')}`
      });
    }
    
    next();
  };
};

module.exports = {
  requirePermission,
  checkResourceAccess,
  canAccessResource,
  checkOwnership,
  applyPermissionFilter,
  hasAnyRole,
  hasRolePermission,
  checkAttributePolicy,
  RESOURCES,
  ACTIONS
};
