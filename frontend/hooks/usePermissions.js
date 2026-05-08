'use client';

/**
 * Frontend Permission Hook
 * Client-side permission checking for UI elements
 */

import { useAuth } from '@/context/AuthContext';

// Mirror backend resources
export const RESOURCES = {
  STUDENT: 'student',
  FACULTY: 'faculty',
  ADMIN: 'admin',
  ATTENDANCE: 'attendance',
  MARKS: 'marks',
  SUBJECT: 'subject',
  DEPARTMENT: 'department',
  NOTICE: 'notice',
  LEAVE: 'leave',
  TICKET: 'ticket',
  EXAM: 'exam',
  TIMETABLE: 'timetable',
  LIBRARY: 'library',
  HOSTEL: 'hostel',
  PLACEMENT: 'placement',
  ALUMNI: 'alumni',
  HOMEWORK: 'homework',
  ASSET: 'asset',
  REPORT: 'report'
};

// Mirror backend actions
export const ACTIONS = {
  CREATE: 'create',
  READ: 'read',
  UPDATE: 'update',
  DELETE: 'delete',
  LIST: 'list',
  APPROVE: 'approve',
  REJECT: 'reject',
  EXPORT: 'export'
};

// Frontend role permissions (mirrored from backend)
const rolePermissions = {
  ADMIN: {
    [RESOURCES.STUDENT]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.DELETE, ACTIONS.LIST, ACTIONS.EXPORT],
    [RESOURCES.FACULTY]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.DELETE, ACTIONS.LIST, ACTIONS.EXPORT],
    [RESOURCES.ATTENDANCE]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.DELETE, ACTIONS.LIST, ACTIONS.EXPORT],
    [RESOURCES.MARKS]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.DELETE, ACTIONS.LIST, ACTIONS.EXPORT],
    [RESOURCES.SUBJECT]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.DELETE, ACTIONS.LIST],
    [RESOURCES.DEPARTMENT]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.DELETE, ACTIONS.LIST],
    [RESOURCES.NOTICE]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.DELETE, ACTIONS.LIST],
    [RESOURCES.LEAVE]: [ACTIONS.READ, ACTIONS.LIST, ACTIONS.APPROVE, ACTIONS.REJECT, ACTIONS.EXPORT],
    [RESOURCES.TICKET]: [ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.LIST, ACTIONS.EXPORT],
    [RESOURCES.EXAM]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.DELETE, ACTIONS.LIST],
    [RESOURCES.TIMETABLE]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.DELETE, ACTIONS.LIST],
    [RESOURCES.LIBRARY]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.DELETE, ACTIONS.LIST],
    [RESOURCES.HOSTEL]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.DELETE, ACTIONS.LIST],
    [RESOURCES.PLACEMENT]: [ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.LIST, ACTIONS.EXPORT],
    [RESOURCES.ALUMNI]: [ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.LIST, ACTIONS.EXPORT],
    [RESOURCES.HOMEWORK]: [ACTIONS.READ, ACTIONS.LIST, ACTIONS.EXPORT],
    [RESOURCES.ASSET]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.DELETE, ACTIONS.LIST],
    [RESOURCES.REPORT]: [ACTIONS.READ, ACTIONS.LIST, ACTIONS.EXPORT]
  },
  FACULTY: {
    [RESOURCES.STUDENT]: [ACTIONS.READ, ACTIONS.LIST],
    [RESOURCES.ATTENDANCE]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.LIST, ACTIONS.EXPORT],
    [RESOURCES.MARKS]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.LIST, ACTIONS.EXPORT],
    [RESOURCES.SUBJECT]: [ACTIONS.READ, ACTIONS.LIST],
    [RESOURCES.DEPARTMENT]: [ACTIONS.READ],
    [RESOURCES.NOTICE]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.LIST],
    [RESOURCES.LEAVE]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.LIST],
    [RESOURCES.TICKET]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.LIST],
    [RESOURCES.EXAM]: [ACTIONS.READ, ACTIONS.LIST],
    [RESOURCES.TIMETABLE]: [ACTIONS.READ, ACTIONS.LIST],
    [RESOURCES.LIBRARY]: [ACTIONS.READ, ACTIONS.LIST],
    [RESOURCES.HOMEWORK]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.DELETE, ACTIONS.LIST],
    [RESOURCES.ASSET]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.LIST],
    [RESOURCES.REPORT]: [ACTIONS.READ, ACTIONS.LIST]
  },
  STUDENT: {
    [RESOURCES.STUDENT]: [ACTIONS.READ],
    [RESOURCES.ATTENDANCE]: [ACTIONS.READ, ACTIONS.LIST],
    [RESOURCES.MARKS]: [ACTIONS.READ, ACTIONS.LIST],
    [RESOURCES.SUBJECT]: [ACTIONS.READ, ACTIONS.LIST],
    [RESOURCES.DEPARTMENT]: [ACTIONS.READ],
    [RESOURCES.NOTICE]: [ACTIONS.READ, ACTIONS.LIST],
    [RESOURCES.LEAVE]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.LIST],
    [RESOURCES.TICKET]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.LIST],
    [RESOURCES.EXAM]: [ACTIONS.READ, ACTIONS.LIST],
    [RESOURCES.TIMETABLE]: [ACTIONS.READ, ACTIONS.LIST],
    [RESOURCES.LIBRARY]: [ACTIONS.READ, ACTIONS.LIST],
    [RESOURCES.HOSTEL]: [ACTIONS.READ, ACTIONS.UPDATE],
    [RESOURCES.PLACEMENT]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.LIST],
    [RESOURCES.ALUMNI]: [ACTIONS.READ, ACTIONS.LIST],
    [RESOURCES.HOMEWORK]: [ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.LIST]
  }
};

/**
 * Hook for checking permissions in React components
 */
export const usePermissions = () => {
  const { user } = useAuth();

  /**
   * Check if current user has permission to perform action on resource
   * @param {string} resource - Resource type
   * @param {string} action - Action to perform
   * @returns {boolean}
   */
  const hasPermission = (resource, action) => {
    if (!user || !user.role) return false;

    // Super admin has all permissions
    if (user.role === 'SUPERADMIN') return true;

    const permissions = rolePermissions[user.role];
    if (!permissions) return false;

    const resourcePermissions = permissions[resource];
    if (!resourcePermissions) return false;

    return resourcePermissions.includes(action);
  };

  /**
   * Check if user has any of the specified roles
   * @param {...string} roles - Roles to check
   * @returns {boolean}
   */
  const hasRole = (...roles) => {
    if (!user || !user.role) return false;
    return roles.includes(user.role);
  };

  /**
   * Check if user can access specific resource (ownership check)
   * @param {Object} resource - Resource object
   * @param {string} ownerField - Field name containing owner ID
   * @returns {boolean}
   */
  const canAccessResource = (resource, ownerField = 'userId') => {
    if (!user || !resource) return false;

    // Admin can access everything
    if (user.role === 'ADMIN' || user.role === 'SUPERADMIN') return true;

    // Check ownership
    const ownerId = resource[ownerField]?._id || resource[ownerField];
    return ownerId?.toString() === user._id?.toString();
  };

  /**
   * Check if user owns the resource
   * @param {string} resourceOwnerId - ID of resource owner
   * @returns {boolean}
   */
  const isOwner = (resourceOwnerId) => {
    if (!user || !resourceOwnerId) return false;
    return resourceOwnerId.toString() === user._id?.toString();
  };

  /**
   * Get all permissions for current user
   * @returns {Object} All permissions
   */
  const getAllPermissions = () => {
    if (!user || !user.role) return {};
    return rolePermissions[user.role] || {};
  };

  return {
    hasPermission,
    hasRole,
    canAccessResource,
    isOwner,
    getAllPermissions,
    user
  };
};

/**
 * Component wrapper for permission-based rendering
 */
export const Can = ({ resource, action, children, fallback = null }) => {
  const { hasPermission } = usePermissions();

  if (hasPermission(resource, action)) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
};

/**
 * Component wrapper for role-based rendering
 */
export const HasRole = ({ roles, children, fallback = null }) => {
  const { hasRole } = usePermissions();

  if (hasRole(...roles)) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
};

export default usePermissions;
