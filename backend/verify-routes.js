require('dotenv').config();
const express = require('express');
const assignmentRoutes = require('./src/routes/assignmentRoutes');

// Create a test app to inspect routes
const app = express();
const router = express.Router();

// Mount assignment routes
router.use('/assignments', assignmentRoutes);

// Extract all routes
function extractRoutes(stack, basePath = '') {
  const routes = [];
  
  stack.forEach(layer => {
    if (layer.route) {
      // This is a route
      const methods = Object.keys(layer.route.methods).join(', ').toUpperCase();
      routes.push({
        path: basePath + layer.route.path,
        methods: methods
      });
    } else if (layer.name === 'router' && layer.handle.stack) {
      // This is a nested router
      const path = layer.regexp.source
        .replace('\\/?', '')
        .replace('(?=\\/|$)', '')
        .replace(/\\\//g, '/')
        .replace(/\^/g, '')
        .replace(/\$/g, '')
        .replace(/\\/g, '');
      
      routes.push(...extractRoutes(layer.handle.stack, basePath + path));
    }
  });
  
  return routes;
}

app.use('/api/v1', router);

const routes = extractRoutes(app._router.stack, '');

console.log('\n=== Assignment Routes ===\n');
routes
  .filter(r => r.path.includes('assignment'))
  .forEach(route => {
    console.log(`${route.methods.padEnd(10)} ${route.path}`);
  });

console.log('\n=== Verification ===');
const upcomingDeadlinesRoute = routes.find(r => 
  r.path.includes('upcoming-deadlines') && r.methods.includes('GET')
);

if (upcomingDeadlinesRoute) {
  console.log('✓ /api/v1/assignments/upcoming-deadlines route is registered');
  console.log(`  Methods: ${upcomingDeadlinesRoute.methods}`);
  console.log(`  Full path: ${upcomingDeadlinesRoute.path}`);
} else {
  console.log('✗ /api/v1/assignments/upcoming-deadlines route NOT FOUND');
}

console.log('\n');
