#!/usr/bin/env node

/**
 * RBAC/ABAC Migration Helper
 * This script helps identify routes that need to be updated with RBAC/ABAC middleware
 */

const fs = require('fs');
const path = require('path');

const routesDir = path.join(__dirname, 'src', 'routes');

// Find all route files
const routeFiles = fs.readdirSync(routesDir).filter(file => file.endsWith('.js'));

console.log('🔍 Scanning routes for RBAC/ABAC migration...\n');

let totalRoutes = 0;
let routesNeedingUpdate = 0;

routeFiles.forEach(file => {
  const filePath = path.join(routesDir, file);
  const content = fs.readFileSync(filePath, 'utf-8');
  
  // Check if file uses old authorize middleware
  const hasOldAuth = content.includes('authorize(');
  const hasNewRBAC = content.includes('requirePermission');
  
  if (hasOldAuth && !hasNewRBAC) {
    console.log(`📄 ${file}`);
    console.log(`   Status: ⚠️  Needs migration`);
    console.log(`   Uses authorize() but not requirePermission()`);
    console.log('');
    routesNeedingUpdate++;
  } else if (hasNewRBAC) {
    console.log(`📄 ${file}`);
    console.log(`   Status: ✅ Already migrated`);
    console.log('');
  }
  
  totalRoutes++;
});

console.log('\n' + '='.repeat(50));
console.log(`\n📊 Summary:`);
console.log(`   Total route files: ${totalRoutes}`);
console.log(`   Files needing update: ${routesNeedingUpdate}`);
console.log(`   Files already migrated: ${totalRoutes - routesNeedingUpdate}`);

if (routesNeedingUpdate > 0) {
  console.log('\n💡 Migration Tips:');
  console.log('   1. Replace authorize() with requirePermission()');
  console.log('   2. Import RESOURCES and ACTIONS from rbac middleware');
  console.log('   3. Add applyPermissionFilter() for list endpoints');
  console.log('   4. Review RBAC_ABAC_GUIDE.md for examples');
}

console.log('\n' + '='.repeat(50) + '\n');
