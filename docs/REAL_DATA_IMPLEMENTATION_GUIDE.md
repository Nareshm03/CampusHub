# Real Data Integration - Implementation Guide

## Overview

This guide provides best practices and patterns for maintaining real data integration across all CampusHub components. Follow these guidelines when creating new components or updating existing ones.

---

## Core Principles

### 1. **Always Use Real Data**
- ❌ Never use mock, placeholder, or hardcoded data
- ✅ Always fetch data from backend API endpoints
- ✅ Use proper loading and error states

### 2. **Fail Gracefully**
- ✅ Handle API errors without breaking the UI
- ✅ Provide meaningful error messages
- ✅ Offer retry mechanisms

### 3. **Validate Everything**
- ✅ Check for null/undefined values
- ✅ Provide default values
- ✅ Validate data types

---

## Standard Patterns

### Pattern 1: Basic Data Fetching

```javascript
'use client';
import { useState, useEffect } from 'react';
import api from '@/lib/axios';

export default function MyComponent() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/endpoint');
      setData(response.data?.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={fetchData} />;
  if (data.length === 0) return <EmptyState />;

  return <DataDisplay data={data} />;
}
```

### Pattern 2: Multiple Parallel Requests

```javascript
const fetchDashboardData = async () => {
  try {
    setLoading(true);
    
    // Use Promise.allSettled to handle partial failures
    const [studentsRes, facultyRes, noticesRes] = await Promise.allSettled([
      api.get('/students'),
      api.get('/faculty'),
      api.get('/notices')
    ]);

    // Handle each response individually
    if (studentsRes.status === 'fulfilled') {
      setStudents(studentsRes.value.data?.data || []);
    }
    
    if (facultyRes.status === 'fulfilled') {
      setFaculty(facultyRes.value.data?.data || []);
    }
    
    if (noticesRes.status === 'fulfilled') {
      setNotices(noticesRes.value.data?.data || []);
    }
  } catch (error) {
    console.error('Dashboard error:', error);
  } finally {
    setLoading(false);
  }
};
```

### Pattern 3: Authentication Check

```javascript
useEffect(() => {
  // Check authentication before fetching
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (!token) {
      console.warn('No authentication token found');
      return;
    }
  }
  
  fetchData();
}, []);
```

### Pattern 4: Data Validation

```javascript
// Safe data access with fallbacks
const studentName = student?.userId?.name || 'Student';
const percentage = totalClasses > 0 
  ? ((present / totalClasses) * 100).toFixed(1) 
  : '0';
const subjects = student?.subjects || [];

// Array safety
const notices = noticesRes.data?.data || [];
const count = notices.filter(n => n.status === 'ACTIVE').length;

// Number validation
const cgpa = data?.cgpa != null ? data.cgpa.toFixed(2) : '--';
```

---

## Component Structure

### Standard Component Template

```javascript
'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import ProtectedRoute from '@/components/ProtectedRoute';
import Card from '@/components/ui/Card';
import { PageLoader } from '@/components/ui/Loading';
import api from '@/lib/axios';

export default function MyPage() {
  // State management
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Data fetching
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await api.get('/endpoint');
      setData(response.data?.data);
    } catch (error) {
      console.error('Error:', error);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <ProtectedRoute allowedRoles={['STUDENT']}>
        <PageLoader message="Loading data..." />
      </ProtectedRoute>
    );
  }

  // Error state
  if (error) {
    return (
      <ProtectedRoute allowedRoles={['STUDENT']}>
        <div className="container py-8">
          <Card className="p-8 text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <button 
              onClick={fetchData}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg"
            >
              Try Again
            </button>
          </Card>
        </div>
      </ProtectedRoute>
    );
  }

  // Empty state
  if (!data || data.length === 0) {
    return (
      <ProtectedRoute allowedRoles={['STUDENT']}>
        <div className="container py-8">
          <Card className="p-12 text-center text-gray-500">
            <p>No data available</p>
          </Card>
        </div>
      </ProtectedRoute>
    );
  }

  // Main content
  return (
    <ProtectedRoute allowedRoles={['STUDENT']}>
      <div className="container py-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-3xl font-bold mb-6">Page Title</h1>
          {/* Render data */}
        </motion.div>
      </div>
    </ProtectedRoute>
  );
}
```

---

## Loading States

### 1. Skeleton Loader

```javascript
if (loading) {
  return (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
        <div 
          key={i} 
          className="h-24 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"
        />
      ))}
    </div>
  );
}
```

### 2. Spinner Loader

```javascript
if (loading) {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      <p className="ml-4 text-gray-600">Loading...</p>
    </div>
  );
}
```

### 3. Page Loader

```javascript
import { PageLoader } from '@/components/ui/Loading';

if (loading) {
  return <PageLoader message="Loading data..." />;
}
```

---

## Error Handling

### 1. Error State with Retry

```javascript
if (error) {
  return (
    <Card className="p-8 text-center">
      <div className="text-red-500 text-4xl mb-4">⚠️</div>
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
        {error}
      </h3>
      <p className="text-gray-500 mb-4">
        Please try again or contact support if the issue persists
      </p>
      <button 
        onClick={fetchData}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
      >
        Try Again
      </button>
    </Card>
  );
}
```

### 2. Toast Notifications

```javascript
import { toast } from 'sonner';

try {
  const response = await api.get('/endpoint');
  setData(response.data?.data);
  toast.success('Data loaded successfully');
} catch (error) {
  console.error('Error:', error);
  toast.error('Failed to load data');
}
```

### 3. Inline Error Messages

```javascript
{error && (
  <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
    <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
  </div>
)}
```

---

## Empty States

### 1. No Data Available

```javascript
if (data.length === 0) {
  return (
    <Card className="p-12 text-center">
      <div className="text-gray-400 text-6xl mb-4">📭</div>
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
        No data available
      </h3>
      <p className="text-gray-500">
        Check back later for updates
      </p>
    </Card>
  );
}
```

### 2. Empty with Action

```javascript
if (items.length === 0) {
  return (
    <Card className="p-12 text-center">
      <div className="text-gray-400 text-6xl mb-4">➕</div>
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
        No items yet
      </h3>
      <p className="text-gray-500 mb-4">
        Get started by creating your first item
      </p>
      <button 
        onClick={handleCreate}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg"
      >
        Create Item
      </button>
    </Card>
  );
}
```

---

## Data Calculations

### 1. Percentage Calculations

```javascript
const calculatePercentage = (present, total) => {
  if (total === 0) return 0;
  return ((present / total) * 100).toFixed(1);
};

const percentage = calculatePercentage(
  item.presentClasses, 
  item.totalClasses
);
```

### 2. Average Calculations

```javascript
const calculateAverage = (values) => {
  if (values.length === 0) return 0;
  const sum = values.reduce((acc, val) => acc + val, 0);
  return (sum / values.length).toFixed(2);
};

const average = calculateAverage([
  mark.internal1 || 0,
  mark.internal2 || 0,
  mark.internal3 || 0
]);
```

### 3. Date Formatting

```javascript
const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

const formattedDate = formatDate(notice.createdAt);
```

---

## Charts and Visualizations

### 1. Bar Chart with Real Data

```javascript
import { BarChart } from '@/components/Charts';

const chartData = subjects.map(subject => ({
  label: subject.name.slice(0, 8),
  value: subject.studentCount
}));

<BarChart 
  data={chartData} 
  height={220} 
  color="#3b82f6" 
/>
```

### 2. Pie Chart with Real Data

```javascript
import { PieChart } from '@/components/Charts';

const pieData = [
  { label: 'Present', value: presentCount },
  { label: 'Absent', value: absentCount }
].filter(d => d.value > 0);

<PieChart 
  data={pieData} 
  size={200} 
/>
```

### 3. Progress Ring

```javascript
import { ProgressRing } from '@/components/Charts';

const percentage = calculatePercentage(present, total);
const color = percentage >= 75 ? '#10b981' : '#ef4444';

<ProgressRing 
  percentage={percentage} 
  size={80} 
  strokeWidth={8} 
  color={color} 
/>
```

---

## API Integration Best Practices

### 1. Axios Configuration

```javascript
// lib/axios.js
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1',
  headers: {
    'Content-Type': 'application/json',
    'api-version': 'v1'
  },
  withCredentials: true,
});

// Request interceptor
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
```

### 2. API Endpoint Naming

```javascript
// ✅ Good - RESTful and descriptive
api.get('/students/me')
api.get('/attendance/summary/:id')
api.get('/marks/my')
api.post('/assignments/:id/submit')

// ❌ Bad - Unclear or non-standard
api.get('/getStudent')
api.get('/att')
api.get('/myMarks')
```

### 3. Response Handling

```javascript
// ✅ Good - Safe access with fallbacks
const response = await api.get('/endpoint');
const data = response.data?.data || [];
const count = response.data?.count ?? 0;

// ❌ Bad - Unsafe access
const data = response.data.data;
const count = response.data.count;
```

---

## Performance Optimization

### 1. Memoization

```javascript
import { useMemo } from 'react';

const expensiveCalculation = useMemo(() => {
  return data.reduce((acc, item) => {
    // Complex calculation
    return acc + item.value;
  }, 0);
}, [data]);
```

### 2. Debouncing

```javascript
import { useState, useEffect } from 'react';

const [searchTerm, setSearchTerm] = useState('');
const [debouncedTerm, setDebouncedTerm] = useState('');

useEffect(() => {
  const timer = setTimeout(() => {
    setDebouncedTerm(searchTerm);
  }, 500);

  return () => clearTimeout(timer);
}, [searchTerm]);

useEffect(() => {
  if (debouncedTerm) {
    fetchSearchResults(debouncedTerm);
  }
}, [debouncedTerm]);
```

### 3. Lazy Loading

```javascript
import dynamic from 'next/dynamic';

const HeavyComponent = dynamic(
  () => import('@/components/HeavyComponent'),
  { loading: () => <LoadingSpinner /> }
);
```

---

## Testing Real Data Integration

### 1. Manual Testing Checklist

```markdown
- [ ] Component loads without errors
- [ ] Loading state displays correctly
- [ ] Data fetches successfully
- [ ] Data displays correctly
- [ ] Error state works (disconnect network)
- [ ] Empty state works (no data scenario)
- [ ] Retry functionality works
- [ ] Calculations are accurate
- [ ] Charts render correctly
- [ ] Responsive on mobile
```

### 2. API Testing

```javascript
// Test endpoint accessibility
const testEndpoint = async () => {
  try {
    const response = await api.get('/endpoint');
    console.log('✅ Endpoint working:', response.status);
    console.log('Data:', response.data);
  } catch (error) {
    console.error('❌ Endpoint failed:', error.message);
  }
};
```

### 3. Data Validation Testing

```javascript
// Test data structure
const validateData = (data) => {
  if (!Array.isArray(data)) {
    console.error('❌ Data is not an array');
    return false;
  }
  
  if (data.length === 0) {
    console.warn('⚠️ Data array is empty');
    return true;
  }
  
  const requiredFields = ['id', 'name', 'value'];
  const hasAllFields = data.every(item => 
    requiredFields.every(field => field in item)
  );
  
  if (!hasAllFields) {
    console.error('❌ Data missing required fields');
    return false;
  }
  
  console.log('✅ Data structure valid');
  return true;
};
```

---

## Common Pitfalls to Avoid

### ❌ Don't Do This

```javascript
// 1. Hardcoded data
const students = [
  { id: 1, name: 'John' },
  { id: 2, name: 'Jane' }
];

// 2. No error handling
const data = await api.get('/endpoint');
setData(data.data.data);

// 3. No loading state
const fetchData = async () => {
  const response = await api.get('/endpoint');
  setData(response.data);
};

// 4. Unsafe data access
const name = student.userId.name;
const percentage = (present / total) * 100;

// 5. No empty state handling
return (
  <div>
    {data.map(item => <Item key={item.id} {...item} />)}
  </div>
);
```

### ✅ Do This Instead

```javascript
// 1. Fetch real data
const [students, setStudents] = useState([]);
useEffect(() => { fetchStudents(); }, []);

// 2. Handle errors
try {
  const data = await api.get('/endpoint');
  setData(data.data?.data || []);
} catch (error) {
  console.error('Error:', error);
  setError('Failed to load data');
}

// 3. Show loading state
const [loading, setLoading] = useState(true);
if (loading) return <LoadingSpinner />;

// 4. Safe data access
const name = student?.userId?.name || 'Unknown';
const percentage = total > 0 ? ((present / total) * 100).toFixed(1) : '0';

// 5. Handle empty state
if (data.length === 0) return <EmptyState />;
return (
  <div>
    {data.map(item => <Item key={item.id} {...item} />)}
  </div>
);
```

---

## Checklist for New Components

Before deploying a new component, verify:

- [ ] Uses real data from API endpoints
- [ ] Has loading state
- [ ] Has error state with retry
- [ ] Has empty state
- [ ] Validates all data access
- [ ] Uses safe navigation (?.  and ||)
- [ ] Handles authentication
- [ ] Has proper error logging
- [ ] Is responsive
- [ ] Has proper TypeScript types (if using TS)
- [ ] Follows naming conventions
- [ ] Has meaningful variable names
- [ ] Is properly documented
- [ ] Has been tested manually
- [ ] Works with no data
- [ ] Works with partial data
- [ ] Works with network errors

---

## Resources

### Documentation
- [API Documentation](./API_DOCUMENTATION.md)
- [Component Library](./COMPONENT_LIBRARY.md)
- [Error Handling Guide](./ERROR_HANDLING.md)

### Tools
- [Axios Documentation](https://axios-http.com/)
- [React Query](https://tanstack.com/query/latest) (for advanced data fetching)
- [SWR](https://swr.vercel.app/) (alternative data fetching library)

### Testing
- [React Testing Library](https://testing-library.com/react)
- [Jest](https://jestjs.io/)
- [Cypress](https://www.cypress.io/) (E2E testing)

---

## Support

For questions or issues:
1. Check existing components for examples
2. Review this guide
3. Check API documentation
4. Contact the development team

---

**Last Updated**: December 2024  
**Version**: 1.0  
**Maintained By**: CampusHub Development Team
