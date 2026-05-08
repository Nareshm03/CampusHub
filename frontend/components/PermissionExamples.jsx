'use client';

/**
 * Example components demonstrating permission-based UI
 */

import usePermissions, { Can, HasRole, RESOURCES, ACTIONS } from '@/hooks/usePermissions';
import { useState } from 'react';

/**
 * Example 1: Conditionally show buttons based on permissions
 */
export const StudentActions = ({ student }) => {
  const { hasPermission, canAccessResource } = usePermissions();

  return (
    <div className="flex gap-2">
      {/* Show edit button only if user can update students */}
      {hasPermission(RESOURCES.STUDENT, ACTIONS.UPDATE) && (
        <button className="btn-primary">
          Edit Student
        </button>
      )}

      {/* Show delete button only if user can delete students */}
      {hasPermission(RESOURCES.STUDENT, ACTIONS.DELETE) && (
        <button className="btn-danger">
          Delete Student
        </button>
      )}

      {/* Show view button if user can read (everyone) */}
      {hasPermission(RESOURCES.STUDENT, ACTIONS.READ) && (
        <button className="btn-secondary">
          View Details
        </button>
      )}
    </div>
  );
};

/**
 * Example 2: Using Can component for declarative permissions
 */
export const AttendancePanel = () => {
  return (
    <div className="panel">
      <h2>Attendance Management</h2>

      {/* Only faculty and admin can mark attendance */}
      <Can resource={RESOURCES.ATTENDANCE} action={ACTIONS.CREATE}>
        <button className="btn-primary">
          Mark Attendance
        </button>
      </Can>

      {/* Everyone can view attendance (filtered by backend) */}
      <Can resource={RESOURCES.ATTENDANCE} action={ACTIONS.READ}>
        <div className="attendance-list">
          {/* Attendance list */}
        </div>
      </Can>

      {/* Only admin can export */}
      <Can 
        resource={RESOURCES.ATTENDANCE} 
        action={ACTIONS.EXPORT}
        fallback={<p className="text-gray-500">Export available for admins only</p>}
      >
        <button className="btn-secondary">
          Export Attendance
        </button>
      </Can>
    </div>
  );
};

/**
 * Example 3: Using HasRole for role-based UI
 */
export const Dashboard = () => {
  return (
    <div className="dashboard">
      {/* Admin-only section */}
      <HasRole roles={['ADMIN', 'SUPERADMIN']}>
        <div className="admin-panel">
          <h2>Admin Controls</h2>
          <button>Manage Users</button>
          <button>System Settings</button>
        </div>
      </HasRole>

      {/* Faculty-only section */}
      <HasRole roles={['FACULTY']}>
        <div className="faculty-panel">
          <h2>Faculty Tools</h2>
          <button>Mark Attendance</button>
          <button>Enter Marks</button>
        </div>
      </HasRole>

      {/* Student-only section */}
      <HasRole roles={['STUDENT']}>
        <div className="student-panel">
          <h2>Student Portal</h2>
          <button>View Attendance</button>
          <button>View Marks</button>
        </div>
      </HasRole>

      {/* Common section for all roles */}
      <div className="common-panel">
        <h2>Notices</h2>
        <Can resource={RESOURCES.NOTICE} action={ACTIONS.READ}>
          {/* Notice list */}
        </Can>
      </div>
    </div>
  );
};

/**
 * Example 4: Dynamic menu based on permissions
 */
export const NavigationMenu = () => {
  const { hasPermission, hasRole } = usePermissions();

  const menuItems = [
    {
      label: 'Students',
      path: '/students',
      resource: RESOURCES.STUDENT,
      action: ACTIONS.LIST
    },
    {
      label: 'Faculty',
      path: '/faculty',
      resource: RESOURCES.FACULTY,
      action: ACTIONS.LIST
    },
    {
      label: 'Attendance',
      path: '/attendance',
      resource: RESOURCES.ATTENDANCE,
      action: ACTIONS.LIST
    },
    {
      label: 'Marks',
      path: '/marks',
      resource: RESOURCES.MARKS,
      action: ACTIONS.LIST
    },
    {
      label: 'Homework',
      path: '/homework',
      resource: RESOURCES.HOMEWORK,
      action: ACTIONS.LIST
    },
    {
      label: 'Reports',
      path: '/reports',
      resource: RESOURCES.REPORT,
      action: ACTIONS.READ
    }
  ];

  return (
    <nav className="nav-menu">
      {menuItems.map(item => (
        hasPermission(item.resource, item.action) && (
          <a key={item.path} href={item.path} className="nav-item">
            {item.label}
          </a>
        )
      ))}
    </nav>
  );
};

/**
 * Example 5: Conditional form fields based on permissions
 */
export const StudentForm = ({ student, isEdit = false }) => {
  const { hasPermission, isOwner } = usePermissions();
  const [formData, setFormData] = useState(student || {});

  const canEdit = isEdit 
    ? hasPermission(RESOURCES.STUDENT, ACTIONS.UPDATE)
    : hasPermission(RESOURCES.STUDENT, ACTIONS.CREATE);

  const canEditSensitiveFields = hasPermission(RESOURCES.STUDENT, ACTIONS.UPDATE) && 
                                  !isOwner(student?._id);

  return (
    <form className="space-y-4">
      {/* Basic fields everyone can edit on their own profile */}
      <div>
        <label>Name</label>
        <input
          type="text"
          value={formData.name || ''}
          disabled={!canEdit}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        />
      </div>

      <div>
        <label>Email</label>
        <input
          type="email"
          value={formData.email || ''}
          disabled={!canEdit}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        />
      </div>

      {/* Sensitive fields only admin can edit */}
      {canEditSensitiveFields && (
        <>
          <div>
            <label>Department</label>
            <select
              value={formData.department || ''}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
            >
              <option value="">Select Department</option>
              {/* Department options */}
            </select>
          </div>

          <div>
            <label>Semester</label>
            <input
              type="number"
              value={formData.semester || ''}
              onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
            />
          </div>
        </>
      )}

      {canEdit && (
        <button type="submit" className="btn-primary">
          {isEdit ? 'Update' : 'Create'} Student
        </button>
      )}
    </form>
  );
};

/**
 * Example 6: Permission-aware data table
 */
export const StudentTable = ({ students }) => {
  const { hasPermission } = usePermissions();

  const canUpdate = hasPermission(RESOURCES.STUDENT, ACTIONS.UPDATE);
  const canDelete = hasPermission(RESOURCES.STUDENT, ACTIONS.DELETE);
  const canExport = hasPermission(RESOURCES.STUDENT, ACTIONS.EXPORT);

  return (
    <div>
      {/* Export button */}
      {canExport && (
        <button className="btn-secondary mb-4">
          Export to CSV
        </button>
      )}

      <table className="w-full">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Department</th>
            <th>Semester</th>
            {(canUpdate || canDelete) && <th>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {students.map(student => (
            <tr key={student._id}>
              <td>{student.name}</td>
              <td>{student.email}</td>
              <td>{student.department?.name}</td>
              <td>{student.semester}</td>
              {(canUpdate || canDelete) && (
                <td className="flex gap-2">
                  {canUpdate && (
                    <button className="btn-sm btn-primary">Edit</button>
                  )}
                  {canDelete && (
                    <button className="btn-sm btn-danger">Delete</button>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

/**
 * Example 7: Permission check with loading state
 */
export const ProtectedComponent = ({ children }) => {
  const { hasPermission, user } = usePermissions();
  const [loading, setLoading] = useState(true);

  // Simulate permission check
  useState(() => {
    if (user) {
      setLoading(false);
    }
  }, [user]);

  if (loading) {
    return <div>Checking permissions...</div>;
  }

  if (!hasPermission(RESOURCES.ADMIN, ACTIONS.READ)) {
    return (
      <div className="p-4 bg-red-100 text-red-700 rounded">
        You don't have permission to access this content.
      </div>
    );
  }

  return <>{children}</>;
};

/**
 * Example 8: Inline permission checks in event handlers
 */
export const ActionButtons = ({ student }) => {
  const { hasPermission, canAccessResource } = usePermissions();

  const handleDelete = () => {
    if (!hasPermission(RESOURCES.STUDENT, ACTIONS.DELETE)) {
      alert('You don\'t have permission to delete students');
      return;
    }

    if (!confirm('Are you sure?')) return;

    // Proceed with delete
    console.log('Deleting student:', student._id);
  };

  const handleEdit = () => {
    if (!hasPermission(RESOURCES.STUDENT, ACTIONS.UPDATE)) {
      alert('You don\'t have permission to edit students');
      return;
    }

    if (!canAccessResource(student, '_id')) {
      alert('You can only edit your own profile');
      return;
    }

    // Proceed with edit
    console.log('Editing student:', student._id);
  };

  return (
    <div className="flex gap-2">
      <button onClick={handleEdit} className="btn-primary">
        Edit
      </button>
      <button onClick={handleDelete} className="btn-danger">
        Delete
      </button>
    </div>
  );
};

export default {
  StudentActions,
  AttendancePanel,
  Dashboard,
  NavigationMenu,
  StudentForm,
  StudentTable,
  ProtectedComponent,
  ActionButtons
};
