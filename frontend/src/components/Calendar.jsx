import { useState } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon, EyeIcon, TrashIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, parseISO, addMonths, subMonths, getDay } from 'date-fns';

export default function Calendar({ events = [], onEventClick, onDateClick, onDeleteEvent, canEdit = false }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showEventDetails, setShowEventDetails] = useState(false);

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

  const handleEventClick = (event) => {
    setSelectedEvent(event);
    setShowEventDetails(true);
    if (onEventClick) {
      onEventClick(event);
    }
  };

  const handleDateClick = (date) => {
    if (onDateClick) {
      onDateClick(date);
    }
  };

  const handleDeleteEvent = (event) => {
    if (onDeleteEvent) {
      onDeleteEvent(event);
    }
    setShowEventDetails(false);
    setSelectedEvent(null);
  };

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {format(currentMonth, 'MMMM yyyy')}
        </h3>
        <div className="flex gap-2">
          <button
            onClick={goToPreviousMonth}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ChevronLeftIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          </button>
          <button
            onClick={goToNextMonth}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ChevronRightIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {/* Day headers */}
        {dayNames.map(day => (
          <div key={day} className="text-center text-xs font-semibold text-gray-600 dark:text-gray-400 py-2">
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
              className={`min-h-[80px] border border-gray-200 dark:border-gray-700 p-1 relative group cursor-pointer ${
                !isCurrentMonth ? 'bg-gray-50 dark:bg-gray-900/50' : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700'
              } ${dayIsToday ? 'ring-2 ring-primary-500 dark:ring-primary-400' : ''}`}
              onClick={() => isCurrentMonth && handleDateClick(date)}
            >
              <div className="flex items-center justify-between mb-1">
                <div className={`text-sm font-medium ${
                  !isCurrentMonth ? 'text-gray-400 dark:text-gray-600' : 'text-gray-900 dark:text-gray-100'
                } ${dayIsToday ? 'text-primary-600 dark:text-primary-400' : ''}`}>
                  {format(date, 'd')}
                </div>
                {isCurrentMonth && canEdit && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDateClick(date);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded transition-opacity"
                    title="Add appointment"
                  >
                    <PlusIcon className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                  </button>
                )}
              </div>
              
              {/* Events */}
              <div className="space-y-1">
                {dayEvents.slice(0, 2).map((event, eventIdx) => (
                  <div
                    key={eventIdx}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEventClick(event);
                    }}
                    className={`text-xs px-1 py-0.5 rounded truncate cursor-pointer hover:opacity-80 transition-opacity ${event.color || 'bg-blue-100 text-blue-800'}`}
                    title={event.title}
                  >
                    {event.title}
                  </div>
                ))}
                {dayEvents.length > 2 && (
                  <div 
                    className="text-xs text-gray-500 dark:text-gray-400 px-1 cursor-pointer hover:text-gray-700 dark:hover:text-gray-300"
                    onClick={(e) => {
                      e.stopPropagation();
                      // Show all events for this day
                      setSelectedEvent({ 
                        title: `${dayEvents.length} events on ${format(date, 'MMM d')}`,
                        allEvents: dayEvents,
                        date: date
                      });
                      setShowEventDetails(true);
                    }}
                  >
                    +{dayEvents.length - 2} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Legend */}
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 grid grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-400 dark:border-yellow-600 rounded"></div>
          <span className="text-gray-600 dark:text-gray-400">Maintenance Due</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-primary-100 dark:bg-primary-900/30 border border-primary-400 dark:border-primary-600 rounded"></div>
          <span className="text-gray-600 dark:text-gray-400">Work Orders</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-blue-100 dark:bg-blue-900/30 border border-blue-400 dark:border-blue-600 rounded"></div>
          <span className="text-gray-600 dark:text-gray-400">Meetings</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-100 dark:bg-green-900/30 border border-green-400 dark:border-green-600 rounded"></div>
          <span className="text-gray-600 dark:text-gray-400">Training</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-purple-100 dark:bg-purple-900/30 border border-purple-400 dark:border-purple-600 rounded"></div>
          <span className="text-gray-600 dark:text-gray-400">Inspections</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-pink-100 dark:bg-pink-900/30 border border-pink-400 dark:border-pink-600 rounded"></div>
          <span className="text-gray-600 dark:text-gray-400">Events</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-orange-100 dark:bg-orange-900/30 border border-orange-400 dark:border-orange-600 rounded"></div>
          <span className="text-gray-600 dark:text-gray-400">Maintenance</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-gray-100 dark:bg-gray-700 border border-gray-400 dark:border-gray-600 rounded"></div>
          <span className="text-gray-600 dark:text-gray-400">Other</span>
        </div>
      </div>

      {/* Event Details Modal */}
      {showEventDetails && selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-700">
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Event Details</h3>
              <button
                onClick={() => {
                  setShowEventDetails(false);
                  setSelectedEvent(null);
                }}
                className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6">
              {selectedEvent.allEvents ? (
                // Multiple events view
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-4">{selectedEvent.title}</h4>
                  <div className="space-y-3">
                    {selectedEvent.allEvents.map((event, idx) => (
                      <div 
                        key={idx}
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                      >
                        <div className="flex-1">
                          <div className={`inline-block px-2 py-1 rounded text-xs font-medium mb-1 ${event.color}`}>
                            {event.title}
                          </div>
                          {event.description && (
                            <p className="text-sm text-gray-600 dark:text-gray-300">{event.description}</p>
                          )}
                        </div>
                        <div className="flex gap-1 ml-2">
                          <button
                            onClick={() => handleEventClick(event)}
                            className="p-1 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded"
                            title="View details"
                          >
                            <EyeIcon className="h-4 w-4" />
                          </button>
                          {canEdit && onDeleteEvent && (
                            <button
                              onClick={() => handleDeleteEvent(event)}
                              className="p-1 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
                              title="Delete event"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                // Single event view
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">{selectedEvent.title}</h4>
                    {selectedEvent.description && (
                      <p className="text-gray-600 dark:text-gray-300">{selectedEvent.description}</p>
                    )}
                  </div>
                  
                  {selectedEvent.date && (
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      <strong>Date:</strong> {format(new Date(selectedEvent.date), 'EEEE, MMMM d, yyyy')}
                    </div>
                  )}
                  
                  {selectedEvent.startDate && (
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      <strong>Time:</strong> {format(new Date(selectedEvent.startDate), 'h:mm a')}
                      {selectedEvent.endDate && ` - ${format(new Date(selectedEvent.endDate), 'h:mm a')}`}
                    </div>
                  )}
                  
                  {selectedEvent.location && (
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      <strong>Location:</strong> {selectedEvent.location}
                    </div>
                  )}
                  
                  {selectedEvent.type && (
                    <div className="text-sm">
                      <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${selectedEvent.color}`}>
                        {selectedEvent.type}
                      </span>
                    </div>
                  )}
                  
                  {selectedEvent.attendees && selectedEvent.attendees.length > 0 && (
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      <strong>Attendees:</strong> {selectedEvent.attendees.length} people
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <div className="sticky bottom-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-end gap-3">
              {!selectedEvent.allEvents && canEdit && onDeleteEvent && (
                <button
                  onClick={() => {
                    if (confirm('Are you sure you want to delete this appointment?')) {
                      handleDeleteEvent(selectedEvent);
                    }
                  }}
                  className="px-4 py-2 bg-red-600 dark:bg-red-700 text-white rounded-lg hover:bg-red-700 dark:hover:bg-red-800 transition-colors"
                >
                  Delete
                </button>
              )}
              <button
                onClick={() => {
                  setShowEventDetails(false);
                  setSelectedEvent(null);
                }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
