/**
 * RBAC/ABAC Testing Utilities
 * Helper functions for testing permission system
 */

const { hasRolePermission, checkAttributePolicy, RESOURCES, ACTIONS } = require('../middleware/rbac');

/**
 * Test all permissions for a given role
 * @param {string} role - Role to test
 * @returns {Object} Permission matrix
 */
const testRolePermissions = (role) => {
  const results = {};
  
  Object.values(RESOURCES).forEach(resource => {
    results[resource] = {};
    Object.values(ACTIONS).forEach(action => {
      results[resource][action] = hasRolePermission(role, resource, action);
    });
  });
  
  return results;
};

/**
 * Generate permission report for all roles
 * @returns {Object} Complete permission matrix
 */
const generatePermissionReport = () => {
  const roles = ['ADMIN', 'FACULTY', 'STUDENT'];
  const report = {};
  
  roles.forEach(role => {
    report[role] = testRolePermissions(role);
  });
  
  return report;
};

/**
 * Test if user can perform action on specific resource
 * @param {Object} user - User object
 * @param {string} resource - Resource type
 * @param {string} action - Action to perform
 * @param {Object} resourceData - Actual resource data
 * @param {Object} context - Additional context
 * @returns {Object} Test result with details
 */
const testPermission = (user, resource, action, resourceData = null, context = {}) => {
  const rbacPass = hasRolePermission(user.role, resource, action);
  const abacPass = checkAttributePolicy(
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
  
  return {
    allowed: rbacPass && abacPass,
    rbac: {
      passed: rbacPass,
      message: rbacPass ? 'Role has permission' : 'Role lacks permission'
    },
    abac: {
      passed: abacPass,
      message: abacPass ? 'Policy conditions met' : 'Policy conditions not met'
    }
  };
};

/**
 * Print permission report to console
 */
const printPermissionReport = () => {
  const report = generatePermissionReport();
  
  console.log('\n' + '='.repeat(70));
  console.log('RBAC Permission Matrix');
  console.log('='.repeat(70) + '\n');
  
  Object.entries(report).forEach(([role, permissions]) => {
    console.log(`\n🔐 ${role}`);
    console.log('-'.repeat(70));
    
    Object.entries(permissions).forEach(([resource, actions]) => {
      const allowedActions = Object.entries(actions)
        .filter(([_, allowed]) => allowed)
        .map(([action]) => action);
      
      if (allowedActions.length > 0) {
        console.log(`  ${resource.padEnd(20)} : ${allowedActions.join(', ')}`);
      }
    });
  });
  
  console.log('\n' + '='.repeat(70) + '\n');
};

/**
 * Test scenarios for common use cases
 */
const testCommonScenarios = () => {
  console.log('\n' + '='.repeat(70));
  console.log('Testing Common Permission Scenarios');
  console.log('='.repeat(70) + '\n');
  
  const scenarios = [
    {
      name: 'Admin creating a student',
      user: { _id: '123', role: 'ADMIN' },
      resource: RESOURCES.STUDENT,
      action: ACTIONS.CREATE
    },
    {
      name: 'Faculty marking attendance',
      user: { _id: '456', role: 'FACULTY' },
      resource: RESOURCES.ATTENDANCE,
      action: ACTIONS.CREATE
    },
    {
      name: 'Student viewing own attendance',
      user: { _id: '789', role: 'STUDENT' },
      resource: RESOURCES.ATTENDANCE,
      action: ACTIONS.READ,
      resourceData: { student: '789' },
      context: {}
    },
    {
      name: 'Student viewing other student\'s attendance',
      user: { _id: '789', role: 'STUDENT' },
      resource: RESOURCES.ATTENDANCE,
      action: ACTIONS.READ,
      resourceData: { student: '999' },
      context: {}
    },
    {
      name: 'Faculty viewing student list',
      user: { _id: '456', role: 'FACULTY' },
      resource: RESOURCES.STUDENT,
      action: ACTIONS.LIST
    },
    {
      name: 'Student creating a ticket',
      user: { _id: '789', role: 'STUDENT' },
      resource: RESOURCES.TICKET,
      action: ACTIONS.CREATE
    },
    {
      name: 'Admin approving leave',
      user: { _id: '123', role: 'ADMIN' },
      resource: RESOURCES.LEAVE,
      action: ACTIONS.APPROVE
    }
  ];
  
  scenarios.forEach(scenario => {
    const result = testPermission(
      scenario.user,
      scenario.resource,
      scenario.action,
      scenario.resourceData,
      scenario.context
    );
    
    console.log(`\n${result.allowed ? '✅' : '❌'} ${scenario.name}`);
    console.log(`   RBAC: ${result.rbac.passed ? '✓' : '✗'} ${result.rbac.message}`);
    console.log(`   ABAC: ${result.abac.passed ? '✓' : '✗'} ${result.abac.message}`);
    console.log(`   Result: ${result.allowed ? 'ALLOWED' : 'DENIED'}`);
  });
  
  console.log('\n' + '='.repeat(70) + '\n');
};

/**
 * Export permission matrix to JSON file
 */
const exportPermissionMatrix = (filename = 'permission-matrix.json') => {
  const report = generatePermissionReport();
  const fs = require('fs');
  const path = require('path');
  
  const outputPath = path.join(__dirname, '..', '..', filename);
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
  
  console.log(`✅ Permission matrix exported to ${filename}`);
};

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];
  
  switch (command) {
    case 'report':
      printPermissionReport();
      break;
    case 'test':
      testCommonScenarios();
      break;
    case 'export':
      exportPermissionMatrix(args[1]);
      break;
    case 'all':
      printPermissionReport();
      testCommonScenarios();
      break;
    default:
      console.log('\nRBAC/ABAC Testing Utilities\n');
      console.log('Usage: node test-rbac.js <command>\n');
      console.log('Commands:');
      console.log('  report  - Print permission matrix for all roles');
      console.log('  test    - Run common permission scenarios');
      console.log('  export  - Export permission matrix to JSON');
      console.log('  all     - Run all tests\n');
  }
}

module.exports = {
  testRolePermissions,
  generatePermissionReport,
  testPermission,
  printPermissionReport,
  testCommonScenarios,
  exportPermissionMatrix
};
