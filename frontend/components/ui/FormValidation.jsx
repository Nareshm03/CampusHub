'use client';
import { useState, useEffect } from 'react';
import { z } from 'zod';

// Enhanced validation schemas
export const validationSchemas = {
  login: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters')
  }),
  
  register: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(50, 'Name too long'),
    email: z.string().email('Invalid email address'),
    password: z.string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/(?=.*[a-z])/, 'Must contain lowercase letter')
      .regex(/(?=.*[A-Z])/, 'Must contain uppercase letter')
      .regex(/(?=.*\d)/, 'Must contain number')
      .regex(/(?=.*[@$!%*?&])/, 'Must contain special character'),
    confirmPassword: z.string(),
    role: z.enum(['STUDENT', 'FACULTY', 'ADMIN']),
    department: z.string().min(1, 'Department is required')
  }).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"]
  }),
  
  student: z.object({
    usn: z.string().min(5, 'USN must be at least 5 characters').max(15, 'USN too long'),
    semester: z.number().min(1, 'Invalid semester').max(8, 'Invalid semester'),
    phone: z.string().regex(/^\d{10}$/, 'Phone must be 10 digits').optional().or(z.literal('')),
    guardianPhone: z.string().regex(/^\d{10}$/, 'Phone must be 10 digits').optional().or(z.literal(''))
  }),
  
  marks: z.object({
    marks: z.number().min(0, 'Marks cannot be negative').max(100, 'Marks cannot exceed 100'),
    maxMarks: z.number().min(1, 'Max marks must be at least 1').max(100, 'Max marks too high')
  })
};

// Real-time validation hook
export const useFormValidation = (schema, initialValues = {}) => {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isValid, setIsValid] = useState(false);

  // Validate single field
  const validateField = (name, value) => {
    try {
      const fieldSchema = schema.shape[name];
      if (fieldSchema) {
        fieldSchema.parse(value);
        setErrors(prev => ({ ...prev, [name]: null }));
        return true;
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        setErrors(prev => ({ ...prev, [name]: error.errors[0].message }));
        return false;
      }
    }
    return true;
  };

  // Validate entire form
  const validateForm = () => {
    try {
      schema.parse(values);
      setErrors({});
      setIsValid(true);
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors = {};
        error.errors.forEach(err => {
          newErrors[err.path[0]] = err.message;
        });
        setErrors(newErrors);
        setIsValid(false);
        return false;
      }
    }
    return false;
  };

  // Update field value
  const setValue = (name, value) => {
    setValues(prev => ({ ...prev, [name]: value }));
    if (touched[name]) {
      validateField(name, value);
    }
  };

  // Mark field as touched
  const setTouched = (name) => {
    setTouched(prev => ({ ...prev, [name]: true }));
    validateField(name, values[name]);
  };

  // Reset form
  const reset = () => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
    setIsValid(false);
  };

  useEffect(() => {
    validateForm();
  }, [values]);

  return {
    values,
    errors,
    touched,
    isValid,
    setValue,
    setTouched,
    validateForm,
    reset
  };
};

// Enhanced Input component with validation
export const ValidatedInput = ({ 
  name, 
  label, 
  type = 'text', 
  validation, 
  onChange, 
  onBlur,
  ...props 
}) => {
  const [error, setError] = useState('');
  const [touched, setTouched] = useState(false);

  const handleChange = (e) => {
    const value = e.target.value;
    onChange?.(name, value);
    
    if (touched && validation) {
      validateField(value);
    }
  };

  const handleBlur = () => {
    setTouched(true);
    onBlur?.(name);
    if (validation) {
      validateField(props.value);
    }
  };

  const validateField = (value) => {
    if (validation) {
      try {
        validation.parse(value);
        setError('');
      } catch (err) {
        if (err instanceof z.ZodError) {
          setError(err.errors[0].message);
        }
      }
    }
  };

  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}
      <input
        type={type}
        onChange={handleChange}
        onBlur={handleBlur}
        className={`
          w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500
          ${error && touched 
            ? 'border-red-500 focus:border-red-500 focus:ring-red-500' 
            : 'border-gray-300 focus:border-primary-500'
          }
        `}
        {...props}
      />
      {error && touched && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
};

// Form wrapper with validation
export const ValidatedForm = ({ schema, onSubmit, children, className = '' }) => {
  const validation = useFormValidation(schema);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validation.validateForm()) {
      onSubmit(validation.values);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={className}>
      {typeof children === 'function' ? children(validation) : children}
    </form>
  );
};