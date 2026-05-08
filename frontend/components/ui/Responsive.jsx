// Responsive utilities
export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px'
};

// Responsive grid component
export const ResponsiveGrid = ({ children, cols = { sm: 1, md: 2, lg: 3, xl: 4 } }) => {
  const gridClasses = [
    `grid`,
    `grid-cols-${cols.sm}`,
    `md:grid-cols-${cols.md}`,
    `lg:grid-cols-${cols.lg}`,
    `xl:grid-cols-${cols.xl}`,
    `gap-4 md:gap-6`
  ].join(' ');

  return <div className={gridClasses}>{children}</div>;
};

// Responsive container
export const Container = ({ children, size = 'default' }) => {
  const sizes = {
    sm: 'max-w-3xl',
    default: 'max-w-7xl',
    lg: 'max-w-full'
  };

  return (
    <div className={`${sizes[size]} mx-auto px-4 sm:px-6 lg:px-8`}>
      {children}
    </div>
  );
};

// Mobile-first navigation
export const MobileNav = ({ isOpen, onClose, children }) => (
  <>
    {/* Overlay */}
    {isOpen && (
      <div 
        className="fixed inset-0 bg-black/50 z-40 lg:hidden"
        onClick={onClose}
      />
    )}
    
    {/* Mobile menu */}
    <div className={`
      fixed top-0 left-0 h-full w-64 bg-white dark:bg-gray-800 z-50 transform transition-transform duration-300 lg:hidden
      ${isOpen ? 'translate-x-0' : '-translate-x-full'}
    `}>
      {children}
    </div>
  </>
);

// Responsive table wrapper
export const ResponsiveTable = ({ children }) => (
  <div className="overflow-x-auto -mx-4 sm:mx-0">
    <div className="inline-block min-w-full align-middle">
      <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
        {children}
      </div>
    </div>
  </div>
);

// Responsive card stack
export const CardStack = ({ children }) => (
  <div className="space-y-4 sm:space-y-0 sm:grid sm:grid-cols-2 lg:grid-cols-3 sm:gap-6">
    {children}
  </div>
);