import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  PlusIcon,
  CalendarIcon,
  ClockIcon,
  MapPinIcon,
  UserGroupIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import api from '../services/api';

export default function Appointments() {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState(null);
  const [viewingAppointment, setViewingAppointment] = useState(null);
  const [filters, setFilters] = useState({
    type: '',
    status: '',
    startDate: '',
    endDate: ''
  });

  const queryClient = useQueryClient();

  // Fetch appointments
  const { data: appointments, isLoading, error } = useQuery({
    queryKey: ['appointments', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
      const response = await api.get(`/appointments?${params}`);
      return response.data;
    }
  });

  // Create appointment mutation
  const createMutation = useMutation({
    mutationFn: async (appointmentData) => {
      const response = await api.post('/appointments', appointmentData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['appointments']);
      setShowCreateForm(false);
    }
  });

  // Update appointment mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, ...appointmentData }) => {
      const response = await api.put(`/appointments/${id}`, appointmentData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['appointments']);
      setEditingAppointment(null);
    }
  });

  // Delete appointment mutation
  const deleteMutation = useMutation({
    mutationFn: async (appointmentId) => {
      await api.delete(`/appointments/${appointmentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['appointments']);
    }
  });

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const appointmentData = {
      title: formData.get('title'),
      description: formData.get('description'),
      startDate: formData.get('startDate'),
      endDate: formData.get('endDate'),
      location: formData.get('location'),
      type: formData.get('type'),
      priority: formData.get('priority'),
      allDay: formData.has('allDay')
    };
    createMutation.mutate(appointmentData);
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const appointmentData = {
      id: editingAppointment._id,
      title: formData.get('title'),
      description: formData.get('description'),
      startDate: formData.get('startDate'),
      endDate: formData.get('endDate'),
      location: formData.get('location'),
      type: formData.get('type'),
      priority: formData.get('priority'),
      status: formData.get('status'),
      allDay: formData.has('allDay')
    };
    updateMutation.mutate(appointmentData);
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'meeting':
        return UserGroupIcon;
      case 'training':
        return CalendarIcon;
      case 'inspection':
        return ClockIcon;
      case 'maintenance':
        return ClockIcon;
      case 'event':
        return CalendarIcon;
      default:
        return CalendarIcon;
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'meeting':
        return 'bg-blue-100 text-blue-800';
      case 'training':
        return 'bg-green-100 text-green-800';
      case 'inspection':
        return 'bg-purple-100 text-purple-800';
      case 'maintenance':
        return 'bg-orange-100 text-orange-800';
      case 'event':
        return 'bg-pink-100 text-pink-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'confirmed':
        return 'bg-blue-100 text-blue-800';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return <div>Loading appointments...</div>;
  }

  if (error) {
    return <div>Error loading appointments: {error.message}</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Appointments</h1>
        <button
          onClick={() => setShowCreateForm(true)}
          className="btn-primary flex items-center gap-2"
        >
          <PlusIcon className="h-5 w-5" />
          New Appointment
        </button>
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <h3 className="text-lg font-semibold mb-4">Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              value={filters.type}
              onChange={(e) => setFilters({ ...filters, type: e.target.value })}
              className="input"
            >
              <option value="">All Types</option>
              <option value="meeting">Meeting</option>
              <option value="training">Training</option>
              <option value="inspection">Inspection</option>
              <option value="maintenance">Maintenance</option>
              <option value="event">Event</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="input"
            >
              <option value="">All Statuses</option>
              <option value="scheduled">Scheduled</option>
              <option value="confirmed">Confirmed</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              className="input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              className="input"
            />
          </div>
        </div>
      </div>

      {/* Appointments List */}
      <div className="grid gap-4">
        {appointments && appointments.length > 0 ? (
          appointments.map((appointment) => {
            const TypeIcon = getTypeIcon(appointment.type);
            return (
              <div key={appointment._id} className="card hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div className={`p-2 rounded-lg ${getTypeColor(appointment.type)}`}>
                      <TypeIcon className="h-6 w-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="text-lg font-semibold text-gray-900 truncate">
                          {appointment.title}
                        </h3>
                        <div className="flex gap-2 ml-4">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getTypeColor(appointment.type)}`}>
                            {appointment.type}
                          </span>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(appointment.priority)}`}>
                            {appointment.priority}
                          </span>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(appointment.status)}`}>
                            {appointment.status}
                          </span>
                        </div>
                      </div>
                      
                      {appointment.description && (
                        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                          {appointment.description}
                        </p>
                      )}
                      
                      <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <CalendarIcon className="h-4 w-4" />
                          <span>
                            {format(new Date(appointment.startDate), 'MMM d, yyyy')}
                            {format(new Date(appointment.startDate), 'MMM d, yyyy') !== format(new Date(appointment.endDate), 'MMM d, yyyy') && 
                              ` - ${format(new Date(appointment.endDate), 'MMM d, yyyy')}`
                            }
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <ClockIcon className="h-4 w-4" />
                          <span>
                            {format(new Date(appointment.startDate), 'h:mm a')} - {format(new Date(appointment.endDate), 'h:mm a')}
                          </span>
                        </div>
                        {appointment.location && (
                          <div className="flex items-center gap-1">
                            <MapPinIcon className="h-4 w-4" />
                            <span>{appointment.location}</span>
                          </div>
                        )}
                        {appointment.attendees && appointment.attendees.length > 0 && (
                          <div className="flex items-center gap-1">
                            <UserGroupIcon className="h-4 w-4" />
                            <span>{appointment.attendees.length} attendees</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => setViewingAppointment(appointment)}
                      className="btn-secondary p-2"
                      title="View Details"
                    >
                      <EyeIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setEditingAppointment(appointment)}
                      className="btn-secondary p-2"
                      title="Edit Appointment"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Are you sure you want to delete this appointment?')) {
                          deleteMutation.mutate(appointment._id);
                        }
                      }}
                      className="btn-danger p-2"
                      title="Delete Appointment"
                      disabled={deleteMutation.isLoading}
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="card text-center py-8">
            <CalendarIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No appointments found</h3>
            <p className="text-gray-500">Create your first appointment to get started.</p>
          </div>
        )}
      </div>

      {/* Create Appointment Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleCreateSubmit}>
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900">Create Appointment</h2>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Date & Time *</label>
                    <input
                      type="datetime-local"
                      name="startDate"
                      required
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Date & Time *</label>
                    <input
                      type="datetime-local"
                      name="endDate"
                      required
                      className="input"
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
                  onClick={() => setShowCreateForm(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isLoading}
                  className="btn-primary"
                >
                  {createMutation.isLoading ? 'Creating...' : 'Create Appointment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Appointment Modal */}
      {viewingAppointment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Appointment Details</h2>
              <button
                onClick={() => setViewingAppointment(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{viewingAppointment.title}</h3>
                {viewingAppointment.description && (
                  <p className="text-gray-600">{viewingAppointment.description}</p>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Start:</span>
                  <div>{format(new Date(viewingAppointment.startDate), 'MMM d, yyyy h:mm a')}</div>
                </div>
                <div>
                  <span className="font-medium text-gray-700">End:</span>
                  <div>{format(new Date(viewingAppointment.endDate), 'MMM d, yyyy h:mm a')}</div>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Type:</span>
                  <div className="capitalize">{viewingAppointment.type}</div>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Priority:</span>
                  <div className="capitalize">{viewingAppointment.priority}</div>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Status:</span>
                  <div className="capitalize">{viewingAppointment.status}</div>
                </div>
                {viewingAppointment.location && (
                  <div>
                    <span className="font-medium text-gray-700">Location:</span>
                    <div>{viewingAppointment.location}</div>
                  </div>
                )}
              </div>
              
              {viewingAppointment.attendees && viewingAppointment.attendees.length > 0 && (
                <div>
                  <span className="font-medium text-gray-700 block mb-2">Attendees:</span>
                  <div className="space-y-1">
                    {viewingAppointment.attendees.map((attendee, index) => (
                      <div key={index} className="flex items-center justify-between text-sm">
                        <span>{attendee.user?.firstName} {attendee.user?.lastName}</span>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          attendee.status === 'accepted' ? 'bg-green-100 text-green-800' :
                          attendee.status === 'declined' ? 'bg-red-100 text-red-800' :
                          attendee.status === 'tentative' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {attendee.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex justify-end">
              <button
                onClick={() => setViewingAppointment(null)}
                className="btn-secondary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Appointment Modal */}
      {editingAppointment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleEditSubmit}>
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900">Edit Appointment</h2>
                <button
                  type="button"
                  onClick={() => setEditingAppointment(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
              
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                  <input
                    type="text"
                    name="title"
                    required
                    defaultValue={editingAppointment.title}
                    className="input"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    name="description"
                    rows={3}
                    defaultValue={editingAppointment.description || ''}
                    className="input"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Date & Time *</label>
                    <input
                      type="datetime-local"
                      name="startDate"
                      required
                      defaultValue={format(new Date(editingAppointment.startDate), "yyyy-MM-dd'T'HH:mm")}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Date & Time *</label>
                    <input
                      type="datetime-local"
                      name="endDate"
                      required
                      defaultValue={format(new Date(editingAppointment.endDate), "yyyy-MM-dd'T'HH:mm")}
                      className="input"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                  <input
                    type="text"
                    name="location"
                    defaultValue={editingAppointment.location || ''}
                    className="input"
                  />
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                    <select name="type" defaultValue={editingAppointment.type} className="input">
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
                    <select name="priority" defaultValue={editingAppointment.priority} className="input">
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select name="status" defaultValue={editingAppointment.status} className="input">
                      <option value="scheduled">Scheduled</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    name="allDay"
                    id="editAllDay"
                    defaultChecked={editingAppointment.allDay}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <label htmlFor="editAllDay" className="ml-2 block text-sm text-gray-900">
                    All day appointment
                  </label>
                </div>
              </div>
              
              <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingAppointment(null)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateMutation.isLoading}
                  className="btn-primary"
                >
                  {updateMutation.isLoading ? 'Updating...' : 'Update Appointment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
