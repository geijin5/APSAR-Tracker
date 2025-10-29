import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'
import Calendar from '../components/Calendar'
import Checklist from '../components/Checklist'
import { printDocument, generatePrintableChecklist } from '../utils/printUtils'
import {
  CubeIcon,
  WrenchScrewdriverIcon,
  ClipboardDocumentListIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  PlayIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'

export default function Dashboard() {
  const [selectedChecklist, setSelectedChecklist] = useState(null);
  const [activeChecklist, setActiveChecklist] = useState([]);
  const [showCreateAppointment, setShowCreateAppointment] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [isAllDay, setIsAllDay] = useState(false);
  const [checklistCompletion, setChecklistCompletion] = useState(null);

  const queryClient = useQueryClient();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const response = await api.get('/dashboard/stats')
      return response.data
    }
  })

  const { data: checklistTemplates } = useQuery({
    queryKey: ['quickChecklistTemplates'],
    queryFn: async () => {
      const response = await api.get('/checklists/templates');
      // Return most commonly used templates for quick access
      return response.data?.slice(0, 6) || [];
    }
  })

  // Appointment mutations
  const createAppointmentMutation = useMutation({
    mutationFn: async (appointmentData) => {
      const response = await api.post('/appointments', appointmentData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['dashboard-stats']);
      setShowCreateAppointment(false);
      setSelectedDate(null);
      setIsAllDay(false);
    }
  });

  const deleteAppointmentMutation = useMutation({
    mutationFn: async (appointmentId) => {
      await api.delete(`/appointments/${appointmentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['dashboard-stats']);
    }
  });

  // Transform calendar data for the Calendar component
  const calendarEvents = useMemo(() => {
    if (!stats?.calendar) return [];
    
    const events = [];
    
    // Add maintenance events
    stats.calendar.maintenance?.forEach(item => {
      if (item.dueDate) {
        events.push({
          date: new Date(item.dueDate),
          title: item.title || `${item.asset?.name || 'Asset'} - Maintenance`,
          color: 'bg-yellow-100 text-yellow-800 border-yellow-400'
        });
      }
    });
    
    // Add work order events
    stats.calendar.workOrders?.forEach(item => {
      if (item.scheduledStartDate) {
        events.push({
          date: new Date(item.scheduledStartDate),
          title: item.title || `${item.asset?.name || 'Asset'} - Work Order`,
          color: 'bg-primary-100 text-primary-800 border-primary-400'
        });
      }
    });
    
    // Add appointment events
    stats.calendar.appointments?.forEach(item => {
      if (item.startDate) {
        events.push({
          _id: item._id,
          date: new Date(item.startDate),
          startDate: item.startDate,
          endDate: item.endDate,
          title: item.title,
          description: item.description,
          location: item.location,
          type: item.type,
          priority: item.priority,
          status: item.status,
          attendees: item.attendees,
          color: item.type === 'meeting' ? 'bg-blue-100 text-blue-800 border-blue-400' :
                 item.type === 'training' ? 'bg-green-100 text-green-800 border-green-400' :
                 item.type === 'inspection' ? 'bg-purple-100 text-purple-800 border-purple-400' :
                 item.type === 'maintenance' ? 'bg-orange-100 text-orange-800 border-orange-400' :
                 item.type === 'event' ? 'bg-pink-100 text-pink-800 border-pink-400' :
                 'bg-gray-100 text-gray-800 border-gray-400'
        });
      }
    });
    
    console.log('Calendar events:', events);
    
    return events;
  }, [stats]);

  // Calendar event handlers
  const handleDateClick = (date) => {
    setSelectedDate(date);
    setShowCreateAppointment(true);
  };

  const handleEventClick = (event) => {
    // Event details are handled within the Calendar component
    console.log('Event clicked:', event);
  };

  const handleDeleteEvent = async (event) => {
    if (event._id) {
      deleteAppointmentMutation.mutate(event._id);
    }
  };

  const handleCreateAppointment = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    const isAllDay = formData.has('allDay');
    const startDateTime = new Date(selectedDate);
    
    // For all-day appointments, set to start of day
    if (isAllDay) {
      startDateTime.setHours(0, 0, 0, 0);
    } else {
      // Set times from form for timed appointments
      const startTime = formData.get('startTime');
      if (startTime) {
        const [hours, minutes] = startTime.split(':');
        startDateTime.setHours(parseInt(hours), parseInt(minutes));
      }
    }

    const appointmentData = {
      title: formData.get('title'),
      description: formData.get('description'),
      startDate: startDateTime.toISOString(),
      location: formData.get('location'),
      type: formData.get('type') || 'meeting',
      priority: formData.get('priority') || 'medium',
      allDay: isAllDay
    };

    // Only add endDate for non-all-day appointments
    if (!isAllDay) {
      const endDateTime = new Date(selectedDate);
      const endTime = formData.get('endTime');
      if (endTime) {
        const [hours, minutes] = endTime.split(':');
        endDateTime.setHours(parseInt(hours), parseInt(minutes));
      } else {
        // Default to 1 hour after start if no end time specified
        endDateTime.setTime(startDateTime.getTime() + 60 * 60 * 1000);
      }
      appointmentData.endDate = endDateTime.toISOString();
    }

    createAppointmentMutation.mutate(appointmentData);
  };

  const handleStartChecklist = (template) => {
    const checklistItems = template.items?.map(item => ({
      item: item.title,
      completed: false,
      notes: '',
      category: item.category,
      required: item.required,
      order: item.order,
      description: item.description
    })) || [];
    
    setActiveChecklist(checklistItems);
    setSelectedChecklist(template);
    setChecklistCompletion(null); // Reset completion data
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'callout':
        return 'bg-red-500';
      case 'maintenance':
        return 'bg-blue-500';
      case 'vehicle_inspection':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  if (isLoading) {
    return <div>Loading...</div>
  }

  const statCards = [
    {
      name: 'Total Assets',
      value: stats?.assets?.total || 0,
      icon: CubeIcon,
      color: 'bg-blue-500'
    },
    {
      name: 'Operational',
      value: stats?.assets?.operational || 0,
      icon: CubeIcon,
      color: 'bg-green-500'
    },
    {
      name: 'Completed Maintenance',
      value: stats?.maintenance?.completed || 0,
      icon: WrenchScrewdriverIcon,
      color: 'bg-green-600'
    },
    {
      name: 'Completed Work Orders',
      value: stats?.workOrders?.completed || 0,
      icon: ClipboardDocumentListIcon,
      color: 'bg-green-600'
    }
  ]

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Dashboard</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {statCards.map((stat) => (
          <div key={stat.name} className="stat-card group cursor-pointer transition-all hover:scale-105">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">{stat.name}</p>
                <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
              </div>
              <div className={`${stat.color} flex-shrink-0 p-4 rounded-xl shadow-md group-hover:shadow-lg transition-all`}>
                <stat.icon className="h-8 w-8 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Alerts */}
      {stats?.maintenance?.overdue > 0 && (
        <div className="mb-8 bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                {stats.maintenance.overdue} Overdue Maintenance Item{stats.maintenance.overdue > 1 ? 's' : ''}
              </h3>
              <p className="mt-2 text-sm text-yellow-700">
                Action required: Please review overdue maintenance items
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Upcoming Maintenance by Date */}
      {stats?.maintenance?.upcoming?.length > 0 && (
        <div className="card mb-6">
          <h3 className="text-lg font-semibold mb-4">Upcoming Maintenance</h3>
          <div className="space-y-4">
            {(() => {
              // Group maintenance by date
              const groupedByDate = stats.maintenance.upcoming.reduce((acc, maintenance) => {
                const dateKey = new Date(maintenance.dueDate).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                });
                if (!acc[dateKey]) {
                  acc[dateKey] = [];
                }
                acc[dateKey].push(maintenance);
                return acc;
              }, {});

              // Sort dates
              const sortedDates = Object.keys(groupedByDate).sort((a, b) => {
                return new Date(a) - new Date(b);
              });

              return sortedDates.map((dateKey) => (
                <div key={dateKey} className="border-l-4 border-primary-500 pl-4">
                  <h4 className="text-sm font-bold text-gray-700 mb-2">{dateKey}</h4>
                  <ul className="space-y-2">
                    {groupedByDate[dateKey].map((maintenance) => (
                      <li key={maintenance._id} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            {maintenance.asset?.name || 'Unknown Asset'}
                          </p>
                          <p className="text-xs text-gray-600">{maintenance.title}</p>
                        </div>
                        <div className="ml-4">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            maintenance.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                            maintenance.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                            maintenance.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {maintenance.priority}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ));
            })()}
          </div>
        </div>
      )}

      {/* Quick Access Checklists */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Quick Access Checklists</h2>
          <p className="text-sm text-gray-500">Start common checklists with one click</p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {checklistTemplates && checklistTemplates.length > 0 ? checklistTemplates.map((template) => (
            <button
              key={template._id}
              onClick={() => handleStartChecklist(template)}
              className="group bg-white rounded-lg shadow-md border-2 border-gray-200 hover:border-blue-500 hover:shadow-lg transition-all duration-200 p-6 text-left"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 rounded-xl ${getTypeColor(template.type)} flex items-center justify-center shadow-md`}>
                  <CheckCircleIcon className="h-6 w-6 text-white" />
                </div>
                <PlayIcon className="h-5 w-5 text-gray-400 group-hover:text-blue-500 transition-colors" />
              </div>
              
              <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                {template.name}
              </h3>
              
              <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                {template.description}
              </p>
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">
                  {template.items?.length || 0} items
                </span>
                <span className="text-blue-600 font-medium">
                  Start Checklist →
                </span>
              </div>
            </button>
          )) : (
            <div className="col-span-full text-center py-8">
              <CheckCircleIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No checklists available</h3>
              <p className="text-gray-500">Checklist templates will appear here once they're loaded.</p>
            </div>
          )}
        </div>
      </div>

      {/* Calendar Section */}
      <div className="mb-8">
        <Calendar 
          events={calendarEvents} 
          onEventClick={handleEventClick}
          onDateClick={handleDateClick}
          onDeleteEvent={handleDeleteEvent}
          canEdit={true}
        />
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expiring Certifications */}
        {stats?.expiring?.length > 0 && (
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Expiring Certifications</h3>
            <ul className="space-y-3">
              {stats.expiring.slice(0, 5).map((item, idx) => (
                <li key={idx} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{item.name}</p>
                    <p className="text-xs text-gray-500">{item.assetNumber}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Check certifications</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Recent Activity */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
          {stats?.recentActivity?.length > 0 ? (
            <ul className="space-y-3">
              {stats.recentActivity.slice(0, 5).map((activity) => (
                <li key={activity._id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{activity.asset.name}</p>
                    <p className="text-xs text-gray-500">
                      {activity.performedBy?.firstName} {activity.performedBy?.lastName}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">
                      {new Date(activity.completedDate).toLocaleDateString()}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500">No recent activity</p>
          )}
        </div>
      </div>

      {/* Active Checklist Modal */}
      {selectedChecklist && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{selectedChecklist.name}</h2>
                <p className="text-sm text-gray-600 mt-1">Complete the checklist below</p>
              </div>
              <button
                onClick={() => {
                  setSelectedChecklist(null);
                  setActiveChecklist([]);
                }}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            
            <div className="p-6">
              <Checklist 
                checklist={activeChecklist}
                onChecklistChange={setActiveChecklist}
                showProgress={true}
                templateData={selectedChecklist}
                showCompletion={true}
                onCompletionChange={setChecklistCompletion}
              />
              
              <div className="mt-6 flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setSelectedChecklist(null);
                    setActiveChecklist([]);
                    setChecklistCompletion(null);
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    // Validate that completion name is filled
                    if (!checklistCompletion?.completedBy?.trim()) {
                      alert('Please enter your name in the "Completed By" field before completing the checklist.');
                      return;
                    }

                    // Check if all required items are completed
                    const requiredItems = activeChecklist.filter(item => item.required);
                    const allRequiredCompleted = requiredItems.length === 0 || requiredItems.every(item => item.completed);
                    
                    if (!allRequiredCompleted) {
                      alert('Please complete all required items (marked with *) before finishing the checklist.');
                      return;
                    }

                    // Use actual completion data for printing
                    const headerInfo = {
                      'Completed By': checklistCompletion.completedBy,
                      'Date': checklistCompletion.completedDate || new Date().toLocaleDateString(),
                      'Time': checklistCompletion.completedTime || new Date().toLocaleTimeString(),
                      ...(checklistCompletion.notes && { 'Notes': checklistCompletion.notes })
                    };
                    
                    const printComponent = generatePrintableChecklist(activeChecklist, selectedChecklist, headerInfo);
                    printDocument(printComponent, `Completed Checklist - ${selectedChecklist.name}`);
                    setSelectedChecklist(null);
                    setActiveChecklist([]);
                    setChecklistCompletion(null);
                  }}
                  disabled={!checklistCompletion?.completedBy?.trim()}
                  className={`px-4 py-2 text-white rounded-lg transition-colors ${
                    checklistCompletion?.completedBy?.trim() 
                      ? 'bg-green-600 hover:bg-green-700' 
                      : 'bg-gray-400 cursor-not-allowed'
                  }`}
                >
                  Complete & Print Checklist
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Appointment Modal */}
      {showCreateAppointment && selectedDate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleCreateAppointment}>
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-900">
                  New Appointment - {selectedDate.toLocaleDateString()}
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateAppointment(false);
                    setSelectedDate(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                  <input
                    type="text"
                    name="title"
                    required
                    className="input"
                    placeholder="Enter appointment title"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    name="description"
                    rows={3}
                    className="input"
                    placeholder="Enter appointment description"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                    <input
                      type="time"
                      name="startTime"
                      className="input"
                      defaultValue="09:00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                    <input
                      type="time"
                      name="endTime"
                      className="input"
                      defaultValue="10:00"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                  <input
                    type="text"
                    name="location"
                    className="input"
                    placeholder="Enter location"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                    <select name="type" className="input">
                      <option value="meeting">Meeting</option>
                      <option value="training">Training</option>
                      <option value="inspection">Inspection</option>
                      <option value="maintenance">Maintenance</option>
                      <option value="event">Event</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                    <select name="priority" className="input">
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    name="allDay"
                    id="allDay"
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <label htmlFor="allDay" className="ml-2 block text-sm text-gray-900">
                    All day appointment
                  </label>
                </div>
              </div>
              
              <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateAppointment(false);
                    setSelectedDate(null);
                  }}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createAppointmentMutation.isLoading}
                  className="btn-primary"
                >
                  {createAppointmentMutation.isLoading ? 'Creating...' : 'Create Appointment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
