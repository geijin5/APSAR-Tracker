import { useState } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, parseISO, addMonths, subMonths, getDay } from 'date-fns';

export default function Calendar({ events = [] }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  
  // Get all days in the month
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
  
  // Get days of previous month to fill the first week
  const firstDayOfWeek = getDay(monthStart); // 0 = Sunday, 1 = Monday, etc.
  const daysToAdd = firstDayOfWeek;
  
  const allDays = [];
  
  // Add days from previous month
  for (let i = daysToAdd - 1; i >= 0; i--) {
    const date = new Date(monthStart);
    date.setDate(date.getDate() - i - 1);
    allDays.push({ date, isCurrentMonth: false });
  }
  
  // Add current month days
  monthDays.forEach(day => {
    allDays.push({ date: day, isCurrentMonth: true });
  });
  
  // Add days from next month to complete the grid
  const remainingDays = 42 - allDays.length; // 6 rows x 7 days
  for (let i = 1; i <= remainingDays; i++) {
    const date = new Date(monthEnd);
    date.setDate(date.getDate() + i);
    allDays.push({ date, isCurrentMonth: false });
  }

  const getEventsForDay = (day) => {
    return events.filter(event => {
      if (!event.date) return false;
      let eventDate;
      try {
        // Handle Date objects
        if (event.date instanceof Date) {
          eventDate = event.date;
        }
        // Handle ISO strings
        else if (typeof event.date === 'string') {
          eventDate = parseISO(event.date);
        }
        // Handle other date formats
        else {
          eventDate = new Date(event.date);
        }
        if (!eventDate || isNaN(eventDate.getTime())) return false;
        return isSameDay(eventDate, day);
      } catch (e) {
        console.error('Error parsing date:', event.date, e);
        return false;
      }
    });
  };

  const goToPreviousMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          {format(currentMonth, 'MMMM yyyy')}
        </h3>
        <div className="flex gap-2">
          <button
            onClick={goToPreviousMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeftIcon className="h-5 w-5 text-gray-600" />
          </button>
          <button
            onClick={goToNextMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronRightIcon className="h-5 w-5 text-gray-600" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {/* Day headers */}
        {dayNames.map(day => (
          <div key={day} className="text-center text-xs font-semibold text-gray-600 py-2">
            {day}
          </div>
        ))}
        
        {/* Calendar days */}
        {allDays.map(({ date, isCurrentMonth }, idx) => {
          const dayEvents = getEventsForDay(date);
          const dayIsToday = isToday(date);
          
          return (
            <div
              key={idx}
              className={`min-h-[80px] border border-gray-200 p-1 ${
                !isCurrentMonth ? 'bg-gray-50' : 'bg-white hover:bg-gray-50'
              } ${dayIsToday ? 'ring-2 ring-primary-500' : ''}`}
            >
              <div className={`text-sm font-medium mb-1 ${
                !isCurrentMonth ? 'text-gray-400' : 'text-gray-900'
              } ${dayIsToday ? 'text-primary-600' : ''}`}>
                {format(date, 'd')}
              </div>
              
              {/* Events */}
              <div className="space-y-1">
                {dayEvents.slice(0, 2).map((event, eventIdx) => (
                  <div
                    key={eventIdx}
                    className={`text-xs px-1 py-0.5 rounded truncate ${event.color || 'bg-blue-100 text-blue-800'}`}
                    title={event.title}
                  >
                    {event.title}
                  </div>
                ))}
                {dayEvents.length > 2 && (
                  <div className="text-xs text-gray-500 px-1">
                    +{dayEvents.length - 2} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Legend */}
      <div className="mt-4 pt-4 border-t border-gray-200 flex gap-4 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-yellow-100 border border-yellow-400 rounded"></div>
          <span className="text-gray-600">Maintenance Due</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-primary-100 border border-primary-400 rounded"></div>
          <span className="text-gray-600">Work Orders</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-accent-100 border border-accent-400 rounded"></div>
          <span className="text-gray-600">Scheduled</span>
        </div>
      </div>
    </div>
  );
}
