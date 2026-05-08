'use client';
import { useAuth } from '../context/AuthContext';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  HomeIcon, 
  UserCircleIcon,
  DocumentTextIcon,
  CalendarIcon,
  ClipboardDocumentCheckIcon,
  Squares2X2Icon
} from '@heroicons/react/24/outline';
import { 
  HomeIcon as HomeSolidIcon, 
  UserCircleIcon as UserSolidIcon,
  DocumentTextIcon as DocumentSolidIcon,
  CalendarIcon as CalendarSolidIcon,
  ClipboardDocumentCheckIcon as ClipboardSolidIcon,
  Squares2X2Icon as SquaresSolidIcon
} from '@heroicons/react/24/solid';

export default function MobileBottomNav() {
  const { user } = useAuth();
  const pathname = usePathname();

  if (!user) return null;

  const getNavLinks = () => {
    const base = { href: `/dashboard/${user.role.toLowerCase()}`, label: 'Home', icon: HomeIcon, activeIcon: HomeSolidIcon };
    
    if (user.role === 'STUDENT') {
      return [
        base,
        { href: '/attendance', label: 'Attendance', icon: CalendarIcon, activeIcon: CalendarSolidIcon },
        { href: '/exams', label: 'Exams', icon: DocumentTextIcon, activeIcon: DocumentSolidIcon },
        { href: '/profile', label: 'Profile', icon: UserCircleIcon, activeIcon: UserSolidIcon },
      ];
    }
    if (user.role === 'FACULTY') {
      return [
        base,
        { href: '/dashboard/faculty/attendance', label: 'Attendance', icon: CalendarIcon, activeIcon: CalendarSolidIcon },
        { href: '/marks', label: 'Marks', icon: ClipboardDocumentCheckIcon, activeIcon: ClipboardSolidIcon },
        { href: '/profile', label: 'Profile', icon: UserCircleIcon, activeIcon: UserSolidIcon },
      ];
    }
    if (user.role === 'PARENT') {
      return [
        base,
        { href: '/fees', label: 'Fees', icon: DocumentTextIcon, activeIcon: DocumentSolidIcon },
        { href: '/notices', label: 'Notices', icon: Squares2X2Icon, activeIcon: SquaresSolidIcon },
        { href: '/profile', label: 'Profile', icon: UserCircleIcon, activeIcon: UserSolidIcon },
      ];
    }
    return [
      base,
      { href: '/dashboard/admin/departments', label: 'Dept', icon: Squares2X2Icon, activeIcon: SquaresSolidIcon },
      { href: '/dashboard/admin/reports', label: 'Reports', icon: DocumentTextIcon, activeIcon: DocumentSolidIcon },
      { href: '/profile', label: 'Profile', icon: UserCircleIcon, activeIcon: UserSolidIcon },
    ];
  };

  const links = getNavLinks();

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 pb-safe pt-2 px-6 shadow-[0_-1px_3px_rgba(0,0,0,0.1)] z-50">
      <div className="flex justify-between items-center h-14 mb-2">
        {links.map((link) => {
          const isActive = pathname === link.href || (link.href !== `/dashboard/${user.role.toLowerCase()}` && pathname.startsWith(link.href));
          const Icon = isActive ? link.activeIcon : link.icon;
          
          return (
            <Link 
              key={link.href} 
              href={link.href}
              className="flex flex-col items-center justify-center relative active:scale-95 transition-transform"
            >
              <div className="relative mb-1 p-1">
                <Icon className={`w-6 h-6 transition-colors duration-200 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`} />
                {isActive && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-blue-500 rounded-full border-2 border-white dark:border-gray-900"></span>
                )}
              </div>
              <span className={`text-[10px] sm:text-xs font-semibold transition-colors duration-200 mt-0.5 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'}`}>
                {link.label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
