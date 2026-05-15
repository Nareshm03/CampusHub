/**
 * RBAC & ABAC Configuration
 * Defines permissions and policies for different roles
 */

// Define resources in the system
const RESOURCES = {
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

// Define actions
const ACTIONS = {
  CREATE: 'create',
  READ: 'read',
  UPDATE: 'update',
  DELETE: 'delete',
  LIST: 'list',
  APPROVE: 'approve',
  REJECT: 'reject',
  EXPORT: 'export'
};

// Role-Based Permissions (RBAC)
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
    [RESOURCES.STUDENT]: [ACTIONS.READ], // Own profile only
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
    [RESOURCES.HOMEWORK]: [ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.LIST] // Update for submission
  },
  
  PARENT: {
    [RESOURCES.STUDENT]: [ACTIONS.READ], // Linked child's profile
    [RESOURCES.ATTENDANCE]: [ACTIONS.READ, ACTIONS.LIST],
    [RESOURCES.MARKS]: [ACTIONS.READ, ACTIONS.LIST],
    [RESOURCES.SUBJECT]: [ACTIONS.READ, ACTIONS.LIST],
    [RESOURCES.DEPARTMENT]: [ACTIONS.READ],
    [RESOURCES.NOTICE]: [ACTIONS.READ, ACTIONS.LIST],
    [RESOURCES.LEAVE]: [ACTIONS.READ, ACTIONS.LIST],
    [RESOURCES.EXAM]: [ACTIONS.READ, ACTIONS.LIST],
    [RESOURCES.TIMETABLE]: [ACTIONS.READ, ACTIONS.LIST],
    [RESOURCES.HOMEWORK]: [ACTIONS.READ, ACTIONS.LIST],
    [RESOURCES.REPORT]: [ACTIONS.READ, ACTIONS.LIST]
  }
};

// Attribute-Based Policies (ABAC)
const attributePolicies = {
  // Students can only access their own data
  studentOwnData: {
    resource: RESOURCES.STUDENT,
    action: [ACTIONS.READ, ACTIONS.UPDATE],
    condition: (user, resource) => {
      return user.role === 'STUDENT' && user.id === resource._id.toString();
    }
  },
  
  // Students can only view their own attendance
  studentOwnAttendance: {
    resource: RESOURCES.ATTENDANCE,
    action: [ACTIONS.READ, ACTIONS.LIST],
    condition: (user, resource) => {
      return user.role === 'STUDENT' && 
             (!resource || resource.student?.toString() === user.id);
    }
  },
  
  // Students can only view their own marks
  studentOwnMarks: {
    resource: RESOURCES.MARKS,
    action: [ACTIONS.READ, ACTIONS.LIST],
    condition: (user, resource) => {
      return user.role === 'STUDENT' && 
             (!resource || resource.student?.toString() === user.id);
    }
  },
  
  // Parents can view their linked child's attendance
  parentLinkedAttendance: {
    resource: RESOURCES.ATTENDANCE,
    action: [ACTIONS.READ, ACTIONS.LIST],
    condition: (user, resource, context) => {
      if (user.role !== 'PARENT') return true;
      return context?.linkedStudentId && 
             (!resource || resource.student?.toString() === context.linkedStudentId);
    }
  },
  
  // Parents can view their linked child's marks
  parentLinkedMarks: {
    resource: RESOURCES.MARKS,
    action: [ACTIONS.READ, ACTIONS.LIST],
    condition: (user, resource, context) => {
      if (user.role !== 'PARENT') return true;
      return context?.linkedStudentId && 
             (!resource || resource.student?.toString() === context.linkedStudentId);
    }
  },
  
  // Faculty can only manage attendance for their subjects
  facultyOwnSubjects: {
    resource: RESOURCES.ATTENDANCE,
    action: [ACTIONS.CREATE, ACTIONS.UPDATE],
    condition: (user, resource, context) => {
      if (user.role !== 'FACULTY') return false;
      // Check if faculty teaches this subject
      return context?.facultySubjects?.includes(resource.subject?.toString());
    }
  },
  
  // Faculty can only enter marks for their subjects
  facultyOwnMarks: {
    resource: RESOURCES.MARKS,
    action: [ACTIONS.CREATE, ACTIONS.UPDATE],
    condition: (user, resource, context) => {
      if (user.role !== 'FACULTY') return false;
      return context?.facultySubjects?.includes(resource.subject?.toString());
    }
  },
  
  // Users can only update their own tickets
  ownTicket: {
    resource: RESOURCES.TICKET,
    action: [ACTIONS.UPDATE],
    condition: (user, resource) => {
      return resource.createdBy?.toString() === user.id;
    }
  },
  
  // Users can only manage their own leave applications
  ownLeave: {
    resource: RESOURCES.LEAVE,
    action: [ACTIONS.UPDATE, ACTIONS.DELETE],
    condition: (user, resource) => {
      return resource.student?.toString() === user.id || 
             resource.faculty?.toString() === user.id;
    }
  },
  
  // Only department head can approve certain actions
  departmentHead: {
    resource: [RESOURCES.LEAVE, RESOURCES.ASSET],
    action: [ACTIONS.APPROVE],
    condition: (user, resource, context) => {
      return user.role === 'FACULTY' && context?.isDepartmentHead === true;
    }
  },
  
  // Institution-based access (multi-tenancy)
  sameInstitution: {
    resource: '*',
    action: '*',
    condition: (user, resource) => {
      if (!user.institution || !resource.institution) return true; // Skip if not multi-tenant
      return user.institution.toString() === resource.institution.toString();
    }
  }
};

// Special permissions that override RBAC
const specialPermissions = {
  SUPER_ADMIN: '*', // Full access to everything
  DEPARTMENT_HEAD: {
    [RESOURCES.FACULTY]: [ACTIONS.READ, ACTIONS.LIST],
    [RESOURCES.STUDENT]: [ACTIONS.READ, ACTIONS.LIST, ACTIONS.EXPORT],
    [RESOURCES.LEAVE]: [ACTIONS.APPROVE, ACTIONS.REJECT]
  }
};

module.exports = {
  RESOURCES,
  ACTIONS,
  rolePermissions,
  attributePolicies,
  specialPermissions
};
