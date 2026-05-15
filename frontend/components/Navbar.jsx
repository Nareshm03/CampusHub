'use client';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import MicroInteractionsSafe from './MicroInteractionsSafe';
import { 
  MagnifyingGlassIcon, 
  UserCircleIcon,
  Bars3Icon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import ThemeToggle from './ui/ThemeToggle';
import GlobalSearch from './ui/GlobalSearch';
import Button from './ui/Button';
import NotificationDropdown from './NotificationDropdown';
import { getProfilePhotoUrl } from '../lib/imageUtils';

const UserAvatar = ({ user, size = 8 }) => {
  const [imgError, setImgError] = useState(false);
  const photoUrl = user?.profilePhoto ? getProfilePhotoUrl(user.profilePhoto) : null;
  const initials = user?.name?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || '?';

  if (photoUrl && !imgError) {
    return (
      <img
        src={photoUrl}
        alt={user.name}
        className={`h-${size} w-${size} rounded-full object-cover`}
        onError={() => setImgError(true)}
      />
    );
  }

  if (user?.name) {
    return (
      <div className={`h-${size} w-${size} rounded-full bg-blue-600 flex items-center justify-center`}>
        <span className="text-white text-xs font-semibold">{initials}</span>
      </div>
    );
  }

  return <UserCircleIcon className={`h-${size} w-${size} text-gray-600 dark:text-gray-400`} />;
};

const Navbar = () => {
  const { user, logout } = useAuth();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);


  if (!user) return null;

  const getNavLinks = () => {
    const links = {
      STUDENT: [
        { href: '/attendance', label: 'Attendance' },
        { href: '/marks/internal', label: 'Internal Marks' },
        { href: '/marks/semester', label: 'Semester Marks' },
        { href: '/exams', label: 'Exams' },
        { href: '/notices', label: 'Notices' },
        { href: '/leaves', label: 'Leaves' },
        { href: '/dashboard/support', label: 'Support' },
        { href: '/alumni-network', label: 'Alumni' },
      ],
      FACULTY: [
        { href: '/dashboard/faculty/attendance', label: 'Attendance' },
        { href: '/dashboard/faculty/marks', label: 'Enter Marks' },
        { href: '/notices', label: 'Notices' },
        { href: '/dashboard/faculty/leaves', label: 'Leave Requests' },
        { href: '/dashboard/support', label: 'Support' },
      ],
      ADMIN: [
        { href: '/dashboard/admin/departments', label: 'Departments' },
        { href: '/dashboard/admin/subjects', label: 'Subjects' },
        { href: '/dashboard/admin/notices', label: 'Notices' },
        { href: '/dashboard/admin/reports', label: 'Reports' },
        { href: '/dashboard/admin/tickets', label: 'Tickets' },
        { href: '/alumni-network', label: 'Alumni' },
      ],
      PARENT: [
        { href: '/fees', label: 'Fees & Payments' },
        { href: '/notices', label: 'Campus Notices' },
        { href: '/dashboard/support', label: 'Support' }
      ]
    };
    return links[user.role] || [];
  };

  return (
    <>
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className="sticky top-0 z-50 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700 shadow-sm"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Logo */}
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Link 
                href={`/dashboard/${user.role.toLowerCase()}`}
                className="flex items-center group"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/logo.png"
                  alt="CampusHub"
                  className="h-11 w-auto object-contain dark:brightness-0 dark:invert"
                  style={{ background: 'transparent' }}
                />
              </Link>
            </motion.div>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center space-x-2">
              {getNavLinks().map((link, index) => (
                <motion.div
                  key={link.href}
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <MicroInteractionsSafe type="hover">
                    <Link
                      href={link.href}
                      className="nav-link relative px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200 rounded-md block"
                    >
                      {link.label}
                    </Link>
                  </MicroInteractionsSafe>
                </motion.div>
              ))}
            </div>

            {/* Right Side Actions */}
            <div className="flex items-center space-x-4">
              {/* Search */}
              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsSearchOpen(true)}
                  className="p-2 hidden sm:flex hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                >
                  <MagnifyingGlassIcon className="h-6 w-6 text-gray-600 dark:text-gray-400" />
                </Button>
              </motion.div>

              {/* Notifications */}
              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                <NotificationDropdown />
              </motion.div>

              {/* Theme Toggle */}
              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                <ThemeToggle />
              </motion.div>

              {/* User Menu */}
              <div className="flex items-center space-x-4 ml-2">
                <div className="hidden md:block text-right">
                  <p className="text-sm font-bold text-gray-900 dark:text-white">{user.name}</p>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{user.role}</p>
                </div>
                <Link href="/profile" className="relative flex items-center justify-center p-1.5 bg-gray-100 dark:bg-gray-800 rounded-full hover:ring-2 hover:ring-blue-500 transition-all">
                  <UserAvatar user={user} size={8} />
                </Link>
                <button
                  onClick={logout}
                  className="hidden sm:flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700 transition-colors"
                >
                  Logout
                </button>
              </div>

              {/* Mobile Menu Button */}
              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="lg:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"
                >
                  {isMobileMenuOpen ? (
                    <XMarkIcon className="h-6 w-6" />
                  ) : (
                    <Bars3Icon className="h-6 w-6" />
                  )}
                </Button>
              </motion.div>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="lg:hidden border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
            >
              <div className="px-4 py-6 space-y-2">
                {getNavLinks().map((link, index) => (
                  <motion.div
                    key={link.href}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Link
                      href={link.href}
                      className="block px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors font-medium"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      {link.label}
                    </Link>
                  </motion.div>
                ))}
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <motion.div whileTap={{ scale: 0.95 }}>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={logout}
                      className="w-full btn btn-secondary text-red-600 border-red-200 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-900/20"
                    >
                      Logout
                    </Button>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>

      {/* Global Search Modal */}
      <GlobalSearch 
        isOpen={isSearchOpen} 
        onClose={() => setIsSearchOpen(false)} 
      />
    </>
  );
};

export default Navbar;