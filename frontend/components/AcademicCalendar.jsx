'use client';

import { useState, useEffect } from 'react';
import axios from '@/lib/axios';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'react-hot-toast';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths } from 'date-fns';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CalendarIcon,
  AcademicCapIcon,
  ClockIcon,
  PlusIcon
} from '@heroicons/react/24/outline';

const EVENT_TYPES = {
  EXAM: { color: 'bg-red-100 text-red-800 border-red-300', icon: '📝' },
  HOLIDAY: { color: 'bg-green-100 text-green-800 border-green-300', icon: '🎉' },
  REGISTRATION: { color: 'bg-blue-100 text-blue-800 border-blue-300', icon: '📋' },
  ORIENTATION: { color: 'bg-purple-100 text-purple-800 border-purple-300', icon: '🎓' },
  OTHER: { color: 'bg-gray-100 text-gray-800 border-gray-300', icon: '📅' }
};

export default function AcademicCalendar() {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendar, setCalendar] = useState(null);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showEventForm, setShowEventForm] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    startDate: '',
    endDate: '',
    type: 'OTHER',
    isHoliday: false
  });

  useEffect(() => {
    loadCurrentCalendar();
    loadUpcomingEvents();
  }, []);

  const loadCurrentCalendar = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get('/calendar/current');
      setCalendar(data.data);
    } catch (error) {
      console.error('Error loading calendar:', error);
      toast.error('Failed to load calendar');
    } finally {
      setLoading(false);
    }
  };

  const loadUpcomingEvents = async () => {
    try {
      const { data } = await axios.get('/calendar/events/upcoming?days=90');
      setUpcomingEvents(data.data);
    } catch (error) {
      console.error('Error loading upcoming events:', error);
    }
  };

  const handleAddEvent = async (e) => {
    e.preventDefault();
    if (!calendar) {
      toast.error('No active calendar found');
      return;
    }

    try {
      await axios.post(`/calendar/${calendar._id}/events`, newEvent);
      await loadCurrentCalendar();
      await loadUpcomingEvents();
      setNewEvent({
        title: '',
        description: '',
        startDate: '',
        endDate: '',
        type: 'OTHER',
        isHoliday: false
      });
      setShowEventForm(false);
      toast.success('Event added successfully');
    } catch (error) {
      console.error('Error adding event:', error);
      toast.error('Failed to add event');
    }
  };

  const getEventsForDate = (date) => {
    if (!calendar?.events) return [];
    
    return calendar.events.filter(event => {
      const eventStart = new Date(event.startDate);
      const eventEnd = event.endDate ? new Date(event.endDate) : eventStart;
      return date >= eventStart && date <= eventEnd;
    });
  };

  const getDaysInMonth = () => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    return eachDayOfInterval({ start, end });
  };

  const previousMonth = () => {
    setCurrentDate(subMonths(currentDate, 1));
  };

  const nextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const days = getDaysInMonth();
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Academic Calendar
            </h1>
            {calendar && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {calendar.academicYear} - Semester {calendar.semester}
              </p>
            )}
          </div>
          {(user.role === 'ADMIN' || user.role === 'FACULTY') && (
            <button
              onClick={() => setShowEventForm(!showEventForm)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <PlusIcon className="h-5 w-5" />
              Add Event
            </button>
          )}
        </div>
      </div>

      {/* Event Form */}
      {showEventForm && (
        <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
            Add New Event
          </h2>
          <form onSubmit={handleAddEvent} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Event Title
                </label>
                <input
                  type="text"
                  required
                  value={newEvent.title}
                  onChange={(e) =>
                    setNewEvent({ ...newEvent, title: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Event Type
                </label>
                <select
                  value={newEvent.type}
                  onChange={(e) =>
                    setNewEvent({ ...newEvent, type: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="EXAM">Exam</option>
                  <option value="HOLIDAY">Holiday</option>
                  <option value="REGISTRATION">Registration</option>
                  <option value="ORIENTATION">Orientation</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description
              </label>
              <textarea
                rows={3}
                value={newEvent.description}
                onChange={(e) =>
                  setNewEvent({ ...newEvent, description: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  required
                  value={newEvent.startDate}
                  onChange={(e) =>
                    setNewEvent({ ...newEvent, startDate: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  End Date (Optional)
                </label>
                <input
                  type="date"
                  value={newEvent.endDate}
                  onChange={(e) =>
                    setNewEvent({ ...newEvent, endDate: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="isHoliday"
                checked={newEvent.isHoliday}
                onChange={(e) =>
                  setNewEvent({ ...newEvent, isHoliday: e.target.checked })
                }
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label
                htmlFor="isHoliday"
                className="ml-2 block text-sm text-gray-700 dark:text-gray-300"
              >
                Mark as Holiday
              </label>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Add Event
              </button>
              <button
                type="button"
                onClick={() => setShowEventForm(false)}
                className="px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {format(currentDate, 'MMMM yyyy')}
            </h2>
            <div className="flex gap-2">
              <button
                onClick={previousMonth}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <ChevronLeftIcon className="h-5 w-5" />
              </button>
              <button
                onClick={nextMonth}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <ChevronRightIcon className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2 mb-2">
            {weekDays.map(day => (
              <div
                key={day}
                className="text-center text-sm font-medium text-gray-500 dark:text-gray-400 py-2"
              >
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {/* Empty cells for days before month starts */}
            {Array.from({ length: days[0].getDay() }).map((_, index) => (
              <div key={`empty-${index}`} className="aspect-square" />
            ))}

            {/* Calendar days */}
            {days.map(day => {
              const events = getEventsForDate(day);
              const hasEvents = events.length > 0;
              const isToday = isSameDay(day, new Date());

              return (
                <button
                  key={day.toISOString()}
                  onClick={() => setSelectedDate(day)}
                  className={`aspect-square p-2 rounded-lg border transition-all ${
                    isToday
                      ? 'bg-blue-50 dark:bg-blue-900 border-blue-500'
                      : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                  } ${!isSameMonth(day, currentDate) ? 'text-gray-400' : ''}`}
                >
                  <div className="text-sm font-medium">{format(day, 'd')}</div>
                  {hasEvents && (
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {events.slice(0, 2).map((event, index) => (
                        <div
                          key={index}
                          className={`w-2 h-2 rounded-full ${
                            EVENT_TYPES[event.type]?.color.split(' ')[0] || 'bg-gray-400'
                          }`}
                        />
                      ))}
                      {events.length > 2 && (
                        <div className="text-xs text-gray-500">+{events.length - 2}</div>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Upcoming Events */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
            Upcoming Events
          </h2>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {upcomingEvents.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                No upcoming events
              </p>
            ) : (
              upcomingEvents.map((event, index) => {
                const eventType = EVENT_TYPES[event.type] || EVENT_TYPES.OTHER;
                return (
                  <div
                    key={index}
                    className={`p-3 rounded-lg border ${eventType.color}`}
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-2xl">{eventType.icon}</span>
                      <div className="flex-1">
                        <h3 className="font-medium">{event.title}</h3>
                        <p className="text-sm mt-1">
                          {format(new Date(event.startDate), 'MMM d, yyyy')}
                          {event.endDate &&
                            ` - ${format(new Date(event.endDate), 'MMM d, yyyy')}`}
                        </p>
                        {event.description && (
                          <p className="text-sm mt-1 opacity-75">
                            {event.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Selected Date Details */}
      {selectedDate && (
        <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
            Events on {format(selectedDate, 'MMMM d, yyyy')}
          </h3>
          <div className="space-y-3">
            {getEventsForDate(selectedDate).length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400">No events on this date</p>
            ) : (
              getEventsForDate(selectedDate).map((event, index) => {
                const eventType = EVENT_TYPES[event.type] || EVENT_TYPES.OTHER;
                return (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border ${eventType.color}`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-3xl">{eventType.icon}</span>
                      <div className="flex-1">
                        <h4 className="font-medium text-lg">{event.title}</h4>
                        <p className="text-sm mt-1">
                          {format(new Date(event.startDate), 'MMM d, yyyy h:mm a')}
                          {event.endDate &&
                            ` - ${format(new Date(event.endDate), 'MMM d, yyyy h:mm a')}`}
                        </p>
                        {event.description && (
                          <p className="mt-2">{event.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <span className="px-2 py-1 bg-white dark:bg-gray-700 rounded text-xs font-medium">
                            {event.type}
                          </span>
                          {event.isHoliday && (
                            <span className="px-2 py-1 bg-green-500 text-white rounded text-xs font-medium">
                              Holiday
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
