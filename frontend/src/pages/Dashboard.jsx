import { useMemo, useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'
import Calendar from '../components/Calendar'
import Checklist from '../components/Checklist'
import { printDocument, generatePrintableChecklist } from '../utils/printUtils'
import { formatDate, formatDateCompact, getCurrentDate, getCurrentTime, getCurrentISOString } from '../utils/dateUtils'
import {
  CubeIcon,
  WrenchScrewdriverIcon,
  ClipboardDocumentListIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  PlayIcon,
  XMarkIcon,
  Bars3Icon,
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline'
import { Link } from 'react-router-dom'

export default function Dashboard() {
  const { user } = useAuth();
  const [selectedChecklist, setSelectedChecklist] = useState(null);
  const [activeChecklist, setActiveChecklist] = useState([]);
  const [showCreateAppointment, setShowCreateAppointment] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [isAllDay, setIsAllDay] = useState(false);
  const [checklistCompletion, setChecklistCompletion] = useState(null);
  const [isEditingLayout, setIsEditingLayout] = useState(false);
  const [showSectionManager, setShowSectionManager] = useState(false);
  const [dashboardLayout, setDashboardLayout] = useState(() => {
    const saved = localStorage.getItem(`dashboard-layout-${user?.id}`);
    return saved ? JSON.parse(saved) : null;
  });
  const [draggedItem, setDraggedItem] = useState(null);

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

  // Fetch expiring certificates
  const { data: expiringCertificates } = useQuery({
    queryKey: ['expiring-certificates'],
    queryFn: async () => {
      const response = await api.get('/certificates/stats/expiring');
      return response.data || [];
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

  // Checklist completion mutation
  const saveCompletedChecklistMutation = useMutation({
    mutationFn: async (completedChecklistData) => {
      const response = await api.post('/completed-checklists', completedChecklistData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['completedChecklists']);
      queryClient.invalidateQueries(['dashboard-stats']);
      setSelectedChecklist(null);
      setActiveChecklist([]);
      setChecklistCompletion(null);
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
    
    // Add appointment events (exclude meetings, training, and events - case-insensitive, including title keywords)
    stats.calendar.appointments?.forEach(item => {
      const itemType = (item.type || '').toString().trim().toLowerCase();
      const titleText = (item.title || '').toString().toLowerCase();
      const isExcludedByType = ['meeting', 'training', 'event'].includes(itemType);
      const isExcludedByTitle = /(\bmeeting\b|\btraining\b|\bevent\b)/i.test(titleText);
      if (item.startDate && !isExcludedByType && !isExcludedByTitle) {
        events.push({
          _id: item._id,
          date: new Date(item.startDate),
          startDate: item.startDate,
          endDate: item.endDate,
          title: item.title,
          description: item.description,
          location: item.location,
          type: itemType || 'other',
          priority: item.priority,
          status: item.status,
          attendees: item.attendees,
          color: itemType === 'inspection' ? 'bg-purple-100 text-purple-800 border-purple-400' :
                 itemType === 'maintenance' ? 'bg-orange-100 text-orange-800 border-orange-400' :
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
      type: formData.get('type') || 'other',
      priority: formData.get('priority') || 'medium',
      allDay: isAllDay,
      ...(user?.role === 'viewer' && { createdByName: formData.get('createdByName') })
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

  // Check if user can customize layout (admin, operator, technician, trainer)
  const canCustomizeLayout = ['admin', 'operator', 'technician', 'trainer'].includes(user?.role);
  const isMember = user?.role === 'viewer';

  // Default layout order - all available sections
  const defaultLayout = [
    'stats',
    'alerts',
    'upcomingMaintenance',
    'quickChecklists',
    'calendar',
    'expiringCertifications',
    'recentActivity'
  ];

  // Section metadata for display
  const sectionMetadata = {
    stats: { name: 'Statistics', description: 'Asset and maintenance statistics' },
    alerts: { name: 'Alerts', description: 'Overdue maintenance and expiring certificates' },
    upcomingMaintenance: { name: 'Upcoming Maintenance', description: 'Scheduled maintenance tasks' },
    quickChecklists: { name: 'Quick Checklists', description: 'Quick access to checklist templates' },
    calendar: { name: 'Calendar', description: 'Upcoming events and appointments' },
    expiringCertifications: { name: 'Expiring Certifications', description: 'Certificates expiring soon' },
    recentActivity: { name: 'Recent Activity', description: 'Latest maintenance activities' }
  };

  // Initialize layout from localStorage or use default
  useEffect(() => {
    if (canCustomizeLayout && !dashboardLayout) {
      setDashboardLayout(defaultLayout);
    }
  }, [user?.id, canCustomizeLayout]);

  // Save layout to localStorage when it changes
  useEffect(() => {
    if (canCustomizeLayout && dashboardLayout && user?.id) {
      localStorage.setItem(`dashboard-layout-${user.id}`, JSON.stringify(dashboardLayout));
    }
  }, [dashboardLayout, canCustomizeLayout, user?.id]);

  // Drag and drop handlers
  const handleDragStart = (e, index) => {
    setDraggedItem(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    if (draggedItem === null || draggedItem === dropIndex) return;

    const newLayout = [...dashboardLayout];
    const [removed] = newLayout.splice(draggedItem, 1);
    newLayout.splice(dropIndex, 0, removed);
    setDashboardLayout(newLayout);
    setDraggedItem(null);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
  };

  // Toggle section visibility
  const toggleSection = (sectionKey) => {
    const current = dashboardLayout || defaultLayout;
    if (current.includes(sectionKey)) {
      // Remove section
      setDashboardLayout(current.filter(key => key !== sectionKey));
    } else {
      // Add section at the end
      setDashboardLayout([...current, sectionKey]);
    }
  };

  // Reset to default layout
  const resetLayout = () => {
    setDashboardLayout(defaultLayout);
  };

  // Get current layout order
  const currentLayout = dashboardLayout || defaultLayout;
  
  // Get available sections (all sections that can be added)
  const availableSections = defaultLayout;

  if (isLoading) {
    return <div className="text-gray-900 dark:text-gray-100">Loading...</div>
  }

  // For members, only show checklists and chat
  if (isMember) {
    return (
      <div className="dark:text-gray-100">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-6">Dashboard</h1>
        
        {/* Quick Access Checklists */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Quick Access Checklists</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Start common checklists with one click</p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {checklistTemplates && checklistTemplates.length > 0 ? checklistTemplates.map((template) => (
              <button
                key={template._id}
                onClick={() => handleStartChecklist(template)}
                className="group bg-white dark:bg-gray-800 rounded-lg shadow-md border-2 border-gray-200 dark:border-gray-700 hover:border-blue-500 hover:shadow-lg transition-all duration-200 p-6 text-left"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-12 h-12 rounded-xl ${getTypeColor(template.type)} flex items-center justify-center shadow-md`}>
                    <CheckCircleIcon className="h-6 w-6 text-white" />
                  </div>
                  <PlayIcon className="h-5 w-5 text-gray-400 dark:text-gray-500 group-hover:text-blue-500 transition-colors" />
                </div>
                
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2 group-hover:text-blue-600 transition-colors">
                  {template.name}
                </h3>
                
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                  {template.description}
                </p>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">
                    {template.items?.length || 0} items
                  </span>
                  <span className="text-blue-600 dark:text-blue-400 font-medium">
                    Start Checklist →
                  </span>
                </div>
              </button>
            )) : (
              <div className="col-span-full text-center py-8">
                <CheckCircleIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No checklists available</h3>
                <p className="text-gray-500 dark:text-gray-400">Checklist templates will appear here once they're loaded.</p>
              </div>
            )}
          </div>
        </div>

        {/* Chat Link */}
        <div className="mb-8">
          <Link
            to="/chat"
            className="group bg-white dark:bg-gray-800 rounded-lg shadow-md border-2 border-gray-200 dark:border-gray-700 hover:border-blue-500 hover:shadow-lg transition-all duration-200 p-6 flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-500 flex items-center justify-center shadow-md">
                <ChatBubbleLeftRightIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Chat</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Communicate with team members</p>
              </div>
            </div>
            <span className="text-blue-600 dark:text-blue-400 font-medium">Go to Chat →</span>
          </Link>
        </div>

        {/* Active Checklist Modal - same as before */}
        {selectedChecklist && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{selectedChecklist.name}</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Complete the checklist below</p>
                </div>
                <button
                  onClick={() => {
                    setSelectedChecklist(null);
                    setActiveChecklist([]);
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1"
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
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (!checklistCompletion?.completedBy?.trim()) {
                        alert('Please enter your name in the "Completed By" field before completing the checklist.');
                        return;
                      }

                      const requiredItems = activeChecklist.filter(item => item.required);
                      const allRequiredCompleted = requiredItems.length === 0 || requiredItems.every(item => item.completed);
                      
                      if (!allRequiredCompleted) {
                        alert('Please complete all required items (marked with *) before finishing the checklist.');
                        return;
                      }

                      const completedChecklistData = {
                        template: selectedChecklist._id,
                        templateName: selectedChecklist.name,
                        templateType: selectedChecklist.type,
                        templateCategory: selectedChecklist.category,
                        items: activeChecklist,
                        completedBy: checklistCompletion.completedBy,
                        completedDate: checklistCompletion.completedDate || getCurrentDate(),
                        completedTime: checklistCompletion.completedTime || getCurrentTime(),
                        notes: checklistCompletion.notes || ''
                      };
                      
                      saveCompletedChecklistMutation.mutate(completedChecklistData);
                    }}
                    disabled={!checklistCompletion?.completedBy?.trim() || saveCompletedChecklistMutation.isLoading}
                    className={`px-4 py-2 text-white rounded-lg transition-colors ${
                      checklistCompletion?.completedBy?.trim() && !saveCompletedChecklistMutation.isLoading
                        ? 'bg-green-600 hover:bg-green-700' 
                        : 'bg-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {saveCompletedChecklistMutation.isLoading ? 'Saving...' : 'Complete & Save Checklist'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
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

  // Section components mapping
  const sectionComponents = {
    stats: (
      <div key="stats" className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {statCards.map((stat) => (
          <div key={stat.name} className="stat-card group cursor-pointer transition-all hover:scale-105 bg-white dark:bg-gray-800 shadow-md rounded-xl p-6 border border-gray-200 dark:border-gray-700 border-l-4 border-primary-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">{stat.name}</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{stat.value}</p>
              </div>
              <div className={`${stat.color} flex-shrink-0 p-4 rounded-xl shadow-md group-hover:shadow-lg transition-all`}>
                <stat.icon className="h-8 w-8 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>
    ),
    alerts: (
      <div key="alerts" className="mb-8">
        {stats?.maintenance?.overdue > 0 && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 dark:border-yellow-500 p-4 rounded-lg mb-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400 dark:text-yellow-500" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  {stats.maintenance.overdue} Overdue Maintenance Item{stats.maintenance.overdue > 1 ? 's' : ''}
                </h3>
                <p className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
                  Action required: Please review overdue maintenance items
                </p>
              </div>
            </div>
          </div>
        )}
        {expiringCertificates && expiringCertificates.length > 0 && (
          <div className="bg-orange-50 dark:bg-orange-900/20 border-l-4 border-orange-400 dark:border-orange-500 p-4 rounded-lg">
            <div className="flex">
              <div className="flex-shrink-0">
                <ExclamationTriangleIcon className="h-5 w-5 text-orange-400 dark:text-orange-500" />
              </div>
              <div className="ml-3 flex-1">
                <h3 className="text-sm font-medium text-orange-800 dark:text-orange-200">
                  {expiringCertificates.length} Certificate{expiringCertificates.length > 1 ? 's' : ''} Expiring Soon
                </h3>
                <p className="mt-2 text-sm text-orange-700 dark:text-orange-300">
                  The following certificates will expire within 30 days:
                </p>
                <ul className="mt-2 space-y-1">
                  {expiringCertificates.slice(0, 5).map((cert) => {
                    const expiryDate = new Date(cert.expiryDate);
                    const daysUntil = Math.ceil((expiryDate - new Date()) / (1000 * 60 * 60 * 24));
                    return (
                      <li key={cert._id} className="text-sm text-orange-700 dark:text-orange-300">
                        • {cert.name} - {cert.user?.firstName} {cert.user?.lastName} ({daysUntil} days)
                      </li>
                    );
                  })}
                  {expiringCertificates.length > 5 && (
                    <li className="text-sm text-orange-700 dark:text-orange-300 font-medium">
                      ...and {expiringCertificates.length - 5} more
                    </li>
                  )}
                </ul>
                <a
                  href="/certificates?expiringSoon=true"
                  className="mt-3 inline-block text-sm font-medium text-orange-800 dark:text-orange-200 hover:text-orange-900 dark:hover:text-orange-100 underline"
                >
                  View all expiring certificates →
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    ),
    upcomingMaintenance: stats?.maintenance?.upcoming?.length > 0 ? (
      <div key="upcomingMaintenance" className="card mb-6 bg-white dark:bg-gray-800 shadow-md rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Upcoming Maintenance</h3>
        <div className="space-y-4">
          {(() => {
            const groupedByDate = stats.maintenance.upcoming.reduce((acc, maintenance) => {
              const dateKey = formatDateCompact(maintenance.dueDate);
              if (!acc[dateKey]) {
                acc[dateKey] = [];
              }
              acc[dateKey].push(maintenance);
              return acc;
            }, {});

            const sortedDates = Object.keys(groupedByDate).sort((a, b) => {
              return new Date(a) - new Date(b);
            });

            return sortedDates.map((dateKey) => (
              <div key={dateKey} className="border-l-4 border-primary-500 pl-4">
                <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">{dateKey}</h4>
                <ul className="space-y-2">
                  {groupedByDate[dateKey].map((maintenance) => (
                    <li key={maintenance._id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 p-2 rounded">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {maintenance.asset?.name || 'Unknown Asset'}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">{maintenance.title}</p>
                      </div>
                      <div className="ml-4">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          maintenance.priority === 'urgent' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                          maintenance.priority === 'high' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' :
                          maintenance.priority === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                          'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
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
    ) : null,
    quickChecklists: (
      <div key="quickChecklists" className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Quick Access Checklists</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Start common checklists with one click</p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {checklistTemplates && checklistTemplates.length > 0 ? checklistTemplates.map((template) => (
            <button
              key={template._id}
              onClick={() => handleStartChecklist(template)}
              className="group bg-white dark:bg-gray-800 rounded-lg shadow-md border-2 border-gray-200 dark:border-gray-700 hover:border-blue-500 hover:shadow-lg transition-all duration-200 p-6 text-left"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 rounded-xl ${getTypeColor(template.type)} flex items-center justify-center shadow-md`}>
                  <CheckCircleIcon className="h-6 w-6 text-white" />
                </div>
                <PlayIcon className="h-5 w-5 text-gray-400 dark:text-gray-500 group-hover:text-blue-500 transition-colors" />
              </div>
              
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2 group-hover:text-blue-600 transition-colors">
                {template.name}
              </h3>
              
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                {template.description}
              </p>
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">
                  {template.items?.length || 0} items
                </span>
                <span className="text-blue-600 dark:text-blue-400 font-medium">
                  Start Checklist →
                </span>
              </div>
            </button>
          )) : (
            <div className="col-span-full text-center py-8">
              <CheckCircleIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No checklists available</h3>
              <p className="text-gray-500 dark:text-gray-400">Checklist templates will appear here once they're loaded.</p>
            </div>
          )}
        </div>
      </div>
    ),
    calendar: (
      <div key="calendar" className="mb-8">
        <Calendar 
          events={calendarEvents} 
          onEventClick={handleEventClick}
          onDateClick={handleDateClick}
          onDeleteEvent={handleDeleteEvent}
          canEdit={true}
        />
      </div>
    ),
    expiringCertifications: stats?.expiring?.length > 0 ? (
      <div key="expiringCertifications" className="card bg-white dark:bg-gray-800 shadow-md rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Expiring Certifications</h3>
        <ul className="space-y-3">
          {stats.expiring.slice(0, 5).map((item, idx) => (
            <li key={idx} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{item.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{item.assetNumber}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500 dark:text-gray-400">Check certifications</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    ) : null,
    recentActivity: (
      <div key="recentActivity" className="card bg-white dark:bg-gray-800 shadow-md rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Recent Activity</h3>
        {stats?.recentActivity?.length > 0 ? (
          <ul className="space-y-3">
            {stats.recentActivity.slice(0, 5).map((activity) => (
              <li key={activity._id} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{activity.asset.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {activity.performedBy?.firstName} {activity.performedBy?.lastName}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {formatDate(activity.completedDate)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400">No recent activity</p>
        )}
      </div>
    )
  };

  return (
    <div className="dark:text-gray-100">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h1>
        {canCustomizeLayout && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSectionManager(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-600 dark:bg-gray-700 text-white rounded-lg hover:bg-gray-700 dark:hover:bg-gray-800 transition-colors"
            >
              <Bars3Icon className="h-5 w-5" />
              Manage Sections
            </button>
            <button
              onClick={() => setIsEditingLayout(!isEditingLayout)}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 dark:bg-primary-700 text-white rounded-lg hover:bg-primary-700 dark:hover:bg-primary-800 transition-colors"
            >
              <Bars3Icon className="h-5 w-5" />
              {isEditingLayout ? 'Done Editing' : 'Edit Layout'}
            </button>
          </div>
        )}
      </div>

      {/* Render sections in custom order */}
      <div className="space-y-6">
        {currentLayout.map((sectionKey, index) => {
          const section = sectionComponents[sectionKey];
          if (!section) return null;

          if (canCustomizeLayout && isEditingLayout) {
            return (
              <div
                key={sectionKey}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                className={`cursor-move p-4 border-2 border-dashed rounded-lg transition-all ${
                  draggedItem === index
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 opacity-50'
                    : 'border-gray-300 dark:border-gray-600 hover:border-primary-400 dark:hover:border-primary-600'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Bars3Icon className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      {sectionKey.replace(/([A-Z])/g, ' $1').trim()}
                    </span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSection(sectionKey);
                    }}
                    className="text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium"
                    title="Remove section"
                  >
                    Remove
                  </button>
                </div>
                {section}
              </div>
            );
          }

          return <div key={sectionKey}>{section}</div>;
        })}
      </div>

      {/* Section Manager Modal */}
      {showSectionManager && canCustomizeLayout && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Manage Dashboard Sections</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Add or remove sections from your dashboard</p>
              </div>
              <button
                onClick={() => setShowSectionManager(false)}
                className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6">
              <div className="mb-4 flex justify-end">
                <button
                  onClick={resetLayout}
                  className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Reset to Default
                </button>
              </div>

              <div className="space-y-3">
                {availableSections.map((sectionKey) => {
                  const isVisible = currentLayout.includes(sectionKey);
                  const metadata = sectionMetadata[sectionKey] || { name: sectionKey, description: '' };

                  return (
                    <div
                      key={sectionKey}
                      className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                          {metadata.name}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {metadata.description}
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer ml-4">
                        <input
                          type="checkbox"
                          checked={isVisible}
                          onChange={() => toggleSection(sectionKey)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600 dark:peer-checked:bg-primary-600"></div>
                        <span className="ml-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                          {isVisible ? 'Visible' : 'Hidden'}
                        </span>
                      </label>
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
                <button
                  onClick={() => setShowSectionManager(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Active Checklist Modal */}
      {selectedChecklist && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{selectedChecklist.name}</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Complete the checklist below</p>
              </div>
              <button
                onClick={() => {
                  setSelectedChecklist(null);
                  setActiveChecklist([]);
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1"
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
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (!checklistCompletion?.completedBy?.trim()) {
                      alert('Please enter your name in the "Completed By" field before completing the checklist.');
                      return;
                    }

                    const requiredItems = activeChecklist.filter(item => item.required);
                    const allRequiredCompleted = requiredItems.length === 0 || requiredItems.every(item => item.completed);
                    
                    if (!allRequiredCompleted) {
                      alert('Please complete all required items (marked with *) before finishing the checklist.');
                      return;
                    }

                    const completedChecklistData = {
                      template: selectedChecklist._id,
                      templateName: selectedChecklist.name,
                      templateType: selectedChecklist.type,
                      templateCategory: selectedChecklist.category,
                      items: activeChecklist,
                      completedBy: checklistCompletion.completedBy,
                      completedDate: checklistCompletion.completedDate || getCurrentDate(),
                      completedTime: checklistCompletion.completedTime || getCurrentTime(),
                      notes: checklistCompletion.notes || ''
                    };
                    
                    saveCompletedChecklistMutation.mutate(completedChecklistData);
                  }}
                  disabled={!checklistCompletion?.completedBy?.trim() || saveCompletedChecklistMutation.isLoading}
                  className={`px-4 py-2 text-white rounded-lg transition-colors ${
                    checklistCompletion?.completedBy?.trim() && !saveCompletedChecklistMutation.isLoading
                      ? 'bg-green-600 hover:bg-green-700' 
                      : 'bg-gray-400 cursor-not-allowed'
                  }`}
                >
                  {saveCompletedChecklistMutation.isLoading ? 'Saving...' : 'Complete & Save Checklist'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Certificate Expiration Alerts */}
      {expiringCertificates && expiringCertificates.length > 0 && (
        <div className="mb-8 bg-orange-50 border-l-4 border-orange-400 p-4 rounded-lg">
          <div className="flex">
            <div className="flex-shrink-0">
              <ExclamationTriangleIcon className="h-5 w-5 text-orange-400" />
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-orange-800">
                {expiringCertificates.length} Certificate{expiringCertificates.length > 1 ? 's' : ''} Expiring Soon
              </h3>
              <p className="mt-2 text-sm text-orange-700">
                The following certificates will expire within 30 days:
              </p>
              <ul className="mt-2 space-y-1">
                {expiringCertificates.slice(0, 5).map((cert) => {
                  const expiryDate = new Date(cert.expiryDate);
                  const daysUntil = Math.ceil((expiryDate - new Date()) / (1000 * 60 * 60 * 24));
                  return (
                    <li key={cert._id} className="text-sm text-orange-700">
                      • {cert.name} - {cert.user?.firstName} {cert.user?.lastName} ({daysUntil} days)
                    </li>
                  );
                })}
                {expiringCertificates.length > 5 && (
                  <li className="text-sm text-orange-700 font-medium">
                    ...and {expiringCertificates.length - 5} more
                  </li>
                )}
              </ul>
              <a
                href="/certificates?expiringSoon=true"
                className="mt-3 inline-block text-sm font-medium text-orange-800 hover:text-orange-900 underline"
              >
                View all expiring certificates →
              </a>
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
                const dateKey = formatDateCompact(maintenance.dueDate);
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
                      {formatDate(activity.completedDate)}
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

                    // Save completed checklist to database
                    const completedChecklistData = {
                      template: selectedChecklist._id,
                      templateName: selectedChecklist.name,
                      templateType: selectedChecklist.type,
                      templateCategory: selectedChecklist.category,
                      items: activeChecklist,
                      completedBy: checklistCompletion.completedBy,
                      completedDate: checklistCompletion.completedDate || getCurrentDate(),
                      completedTime: checklistCompletion.completedTime || getCurrentTime(),
                      notes: checklistCompletion.notes || ''
                    };
                    
                    saveCompletedChecklistMutation.mutate(completedChecklistData);
                  }}
                  disabled={!checklistCompletion?.completedBy?.trim() || saveCompletedChecklistMutation.isLoading}
                  className={`px-4 py-2 text-white rounded-lg transition-colors ${
                    checklistCompletion?.completedBy?.trim() && !saveCompletedChecklistMutation.isLoading
                      ? 'bg-green-600 hover:bg-green-700' 
                      : 'bg-gray-400 cursor-not-allowed'
                  }`}
                >
                  {saveCompletedChecklistMutation.isLoading ? 'Saving...' : 'Complete & Save Checklist'}
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
                  New Appointment - {formatDate(selectedDate)}
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

                {/* Name field for viewer users */}
                {user?.role === 'viewer' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Your Name *</label>
                    <input
                      type="text"
                      name="createdByName"
                      required
                      className="input"
                      placeholder="Enter your full name"
                    />
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                    <select name="type" className="input">
                      <option value="inspection">Inspection</option>
                      <option value="maintenance">Maintenance</option>
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
