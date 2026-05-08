'use client';
import Badge from './ui/Badge';

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI'];
const PERIODS = [1, 2, 3, 4, 5, 6];

const getCurrentDay = () => {
  const dayMap = { 1: 'MON', 2: 'TUE', 3: 'WED', 4: 'THU', 5: 'FRI' };
  return dayMap[new Date().getDay()] || '';
};

// BUG FIX: accept timetable from API prop; guard against null/undefined
const TimetableTable = ({ timetable = [], userRole }) => {
  const currentDay = getCurrentDay();
  const entries = Array.isArray(timetable) ? timetable : [];

  // Normalise role to uppercase for consistent comparison
  const role = userRole?.toUpperCase();

  if (entries.length === 0) {
    return (
      <p className="text-center text-gray-500 dark:text-gray-400 py-12">
        No timetable entries found.
      </p>
    );
  }

  if (role === 'STUDENT') {
    const getEntry = (day, period) =>
      entries.find(e => e.day === day && e.period === period);

    return (
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700">
            <tr className="border-b border-gray-200 dark:border-gray-600">
              <th className="text-left py-3.5 px-6 text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Day / Period
              </th>
              {PERIODS.map(p => (
                <th key={p} className="text-center py-3.5 px-6 text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Period {p}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-900">
            {DAYS.map(day => (
              <tr
                key={day}
                className={`border-b border-gray-100 dark:border-gray-800 hover:bg-blue-50 dark:hover:bg-gray-800/50 transition-all duration-150 ${
                  day === currentDay ? 'bg-blue-50/50 dark:bg-blue-900/20' : ''
                }`}
              >
                <td className="py-4 px-4 font-medium text-gray-900 dark:text-white">
                  {day}
                  {day === currentDay && (
                    <Badge variant="info" size="sm" className="ml-2">Today</Badge>
                  )}
                </td>
                {PERIODS.map(period => {
                  const entry = getEntry(day, period);
                  return (
                    <td key={`${day}-${period}`} className="py-4 px-4 text-center">
                      {entry ? (
                        <div className="space-y-1">
                          <div className="font-medium text-sm text-gray-900 dark:text-white">
                            {entry.subject?.name ?? '—'}
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-400">
                            {entry.faculty?.name ?? ''}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // Faculty view — grouped by day
  const groupedByDay = DAYS.reduce((acc, day) => {
    acc[day] = entries.filter(e => e.day === day);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {DAYS.map(day => (
        <div
          key={day}
          className={day === currentDay ? 'bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg' : ''}
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
            {day}
            {day === currentDay && (
              <Badge variant="info" size="sm" className="ml-2">Today</Badge>
            )}
          </h3>
          {groupedByDay[day].length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {groupedByDay[day].map((entry, index) => (
                <div
                  key={entry._id ?? index}
                  className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      {entry.subject?.name ?? '—'}
                    </h4>
                    <Badge variant="info" size="sm">Period {entry.period}</Badge>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {entry.department?.name ?? 'N/A'} — Semester {entry.semester}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 text-sm">No classes scheduled</p>
          )}
        </div>
      ))}
    </div>
  );
};

export default TimetableTable;
