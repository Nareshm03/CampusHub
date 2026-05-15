# Real Data Integration - Quick Reference Card

## 🚀 Quick Start

### Basic Component Template

```javascript
'use client';
import { useState, useEffect } from 'react';
import api from '@/lib/axios';

export default function MyComponent() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get('/endpoint');
        setData(res.data?.data || []);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (data.length === 0) return <div>No data</div>;
  
  return <div>{/* Render data */}</div>;
}
```

---

## ✅ Do's

```javascript
// ✅ Safe data access
const name = student?.userId?.name || 'Unknown';

// ✅ Array safety
const items = response.data?.data || [];

// ✅ Number validation
const percentage = total > 0 ? (present / total) * 100 : 0;

// ✅ Error handling
try {
  const res = await api.get('/endpoint');
  setData(res.data?.data || []);
} catch (error) {
  console.error('Error:', error);
  setError('Failed to load');
}

// ✅ Loading state
if (loading) return <LoadingSpinner />;

// ✅ Empty state
if (data.length === 0) return <EmptyState />;
```

---

## ❌ Don'ts

```javascript
// ❌ Hardcoded data
const students = [{ id: 1, name: 'John' }];

// ❌ Unsafe access
const name = student.userId.name;

// ❌ No error handling
const data = await api.get('/endpoint');

// ❌ No loading state
const fetchData = async () => {
  const res = await api.get('/endpoint');
  setData(res.data);
};

// ❌ No validation
const percentage = (present / total) * 100;
```

---

## 🔧 Common Patterns

### Fetch Data
```javascript
const fetchData = async () => {
  try {
    setLoading(true);
    const res = await api.get('/endpoint');
    setData(res.data?.data || []);
  } catch (error) {
    console.error('Error:', error);
    setError('Failed to load data');
  } finally {
    setLoading(false);
  }
};
```

### Multiple Requests
```javascript
const [res1, res2] = await Promise.allSettled([
  api.get('/endpoint1'),
  api.get('/endpoint2')
]);

if (res1.status === 'fulfilled') {
  setData1(res1.value.data?.data || []);
}
```

### Auth Check
```javascript
useEffect(() => {
  const token = localStorage.getItem('token');
  if (!token) return;
  fetchData();
}, []);
```

---

## 📊 Data Validation

```javascript
// Null/undefined check
const value = data?.field || 'default';

// Array check
const items = Array.isArray(data) ? data : [];

// Number check
const num = typeof value === 'number' ? value : 0;

// Date check
const date = value ? new Date(value) : new Date();
```

---

## 🎨 UI States

### Loading
```javascript
if (loading) {
  return <div className="animate-pulse">Loading...</div>;
}
```

### Error
```javascript
if (error) {
  return (
    <div className="text-red-600">
      {error}
      <button onClick={retry}>Retry</button>
    </div>
  );
}
```

### Empty
```javascript
if (data.length === 0) {
  return <div>No data available</div>;
}
```

---

## 🔍 Common Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/students/me` | GET | Current student |
| `/attendance/summary/:id` | GET | Attendance summary |
| `/marks/my` | GET | Student marks |
| `/notices/my` | GET | Student notices |
| `/leaves/my` | GET | Leave requests |
| `/grades/calculate/me` | GET | CGPA calculation |

---

## 🧮 Calculations

### Percentage
```javascript
const percentage = total > 0 
  ? ((present / total) * 100).toFixed(1) 
  : '0';
```

### Average
```javascript
const average = values.length > 0
  ? (values.reduce((a, b) => a + b, 0) / values.length).toFixed(2)
  : '0';
```

### Date Formatting
```javascript
const formatted = new Date(dateString).toLocaleDateString();
```

---

## 🎯 Checklist

Before committing:
- [ ] Uses real API data
- [ ] Has loading state
- [ ] Has error handling
- [ ] Has empty state
- [ ] Validates data access
- [ ] No hardcoded values
- [ ] Tested manually

---

## 📚 Resources

- **Full Guide**: `REAL_DATA_IMPLEMENTATION_GUIDE.md`
- **Verification**: `REAL_DATA_INTEGRATION_VERIFICATION.md`
- **Testing**: `TESTING_GUIDE.md`

---

## 🆘 Troubleshooting

### 404 Error
```javascript
// Check endpoint exists
// Verify authentication
// Check API base URL
```

### Empty Data
```javascript
// Verify API returns data
// Check data path: res.data?.data
// Validate database has records
```

### Loading Forever
```javascript
// Add finally block
// Check for errors
// Verify API responds
```

---

## 💡 Pro Tips

1. Always use `?.` for nested objects
2. Always provide fallback values with `||`
3. Always handle errors with try-catch
4. Always show loading states
5. Always validate before calculations
6. Always test with empty data
7. Always test with network errors

---

**Quick Reference v1.0** | CampusHub Development Team
