import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import {
  PlusIcon,
  ClipboardDocumentListIcon,
  MapPinIcon,
  CalendarIcon,
  UserGroupIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  PencilIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import api from '../services/api';

export default function Callouts() {
  const { user } = useAuth();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [viewingCallout, setViewingCallout] = useState(null);
  const [filters, setFilters] = useState({
    status: '',
    type: ''
  });

  const queryClient = useQueryClient();

  // Create callout mutation
  const createMutation = useMutation({
    mutationFn: async (formData) => {
      const response = await api.post('/callouts', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['callouts']);
      setShowCreateForm(false);
    }
  });

  // Fetch callouts
  const { data: callouts, isLoading, error } = useQuery({
    queryKey: ['callouts', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.type) params.append('type', filters.type);
      const response = await api.get(`/callouts?${params}`);
      return response.data;
    }
  });

  // Check in/out mutations
  const checkInMutation = useMutation({
    mutationFn: async ({ calloutId, role, notes }) => {
      const response = await api.post(`/callouts/${calloutId}/checkin`, { role, notes });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['callouts']);
    }
  });

  const checkOutMutation = useMutation({
    mutationFn: async (calloutId) => {
      const response = await api.post(`/callouts/${calloutId}/checkout`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['callouts']);
    }
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'completed':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'search':
        return 'bg-yellow-100 text-yellow-800';
      case 'rescue':
        return 'bg-red-100 text-red-800';
      case 'recovery':
        return 'bg-purple-100 text-purple-800';
      case 'assist':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const isCheckedIn = (callout) => {
    if (!callout.respondingMembers) return false;
    return callout.respondingMembers.some(
      m => (m.member?._id === user?.id || m.member === user?.id) && !m.checkOutTime
    );
  };

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    const calloutData = new FormData();
    calloutData.append('title', formData.get('title'));
    calloutData.append('type', formData.get('type'));
    calloutData.append('status', formData.get('status') || 'active');
    calloutData.append('startDate', formData.get('startDate'));
    if (formData.get('endDate')) {
      calloutData.append('endDate', formData.get('endDate'));
    }
    calloutData.append('incidentDescription', formData.get('incidentDescription') || '');
    calloutData.append('requestingAgency', formData.get('requestingAgency') || '');
    
    // Location
    if (formData.get('locationAddress')) {
      const location = {
        address: formData.get('locationAddress'),
        description: formData.get('locationDescription') || ''
      };
      calloutData.append('location', JSON.stringify(location));
    }

    // Contact person
    if (formData.get('contactName')) {
      const contactPerson = {
        name: formData.get('contactName'),
        phone: formData.get('contactPhone') || '',
        agency: formData.get('contactAgency') || ''
      };
      calloutData.append('contactPerson', JSON.stringify(contactPerson));
    }

    const attachments = formData.getAll('attachments');
    attachments.forEach(file => {
      if (file instanceof File) {
        calloutData.append('attachments', file);
      }
    });

    createMutation.mutate(calloutData);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-[400px]">Loading callouts...</div>;
  }

  if (error) {
    return <div className="text-red-600">Error loading callouts: {error.message}</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Callouts</h1>
          <p className="text-sm text-gray-500 mt-1">Track and manage search and rescue callouts</p>
        </div>
        {['admin', 'operator'].includes(user?.role) && (
          <button
            onClick={() => setShowCreateForm(true)}
            className="btn-primary flex items-center gap-2"
          >
            <PlusIcon className="h-5 w-5" />
            New Callout
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <h3 className="text-lg font-semibold mb-4">Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="input"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              value={filters.type}
              onChange={(e) => setFilters({ ...filters, type: e.target.value })}
              className="input"
            >
              <option value="">All Types</option>
              <option value="search">Search</option>
              <option value="rescue">Rescue</option>
              <option value="recovery">Recovery</option>
              <option value="assist">Assist</option>
              <option value="training">Training</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>
      </div>

      {/* Callouts List */}
      <div className="grid gap-4">
        {callouts && callouts.length > 0 ? (
          callouts.map((callout) => {
            const checkedIn = isCheckedIn(callout);
            const memberCount = callout.respondingMembers?.filter(m => !m.checkOutTime).length || 0;

            return (
              <div key={callout._id} className="card hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">
                          {callout.title}
                        </h3>
                        <p className="text-sm text-gray-500">{callout.calloutNumber}</p>
                      </div>
                      <div className="flex gap-2">
                        <span className={`px-3 py-1 text-xs font-medium rounded-full border ${getStatusColor(callout.status)}`}>
                          {callout.status}
                        </span>
                        <span className={`px-3 py-1 text-xs font-medium rounded-full ${getTypeColor(callout.type)}`}>
                          {callout.type}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 mb-3">
                      <div className="flex items-center gap-1">
                        <CalendarIcon className="h-4 w-4" />
                        <span>{format(new Date(callout.startDate), 'MMM d, yyyy h:mm a')}</span>
                      </div>
                      {callout.location?.address && (
                        <div className="flex items-center gap-1">
                          <MapPinIcon className="h-4 w-4" />
                          <span className="truncate">{callout.location.address}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <UserGroupIcon className="h-4 w-4" />
                        <span>{memberCount} member{memberCount !== 1 ? 's' : ''}</span>
                      </div>
                      {callout.reports && callout.reports.length > 0 && (
                        <div className="flex items-center gap-1">
                          <DocumentTextIcon className="h-4 w-4" />
                          <span>{callout.reports.length} report{callout.reports.length !== 1 ? 's' : ''}</span>
                        </div>
                      )}
                    </div>

                    {callout.incidentDescription && (
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                        {callout.incidentDescription}
                      </p>
                    )}

                    {callout.requestingAgency && (
                      <p className="text-xs text-gray-500">
                        Requested by: {callout.requestingAgency}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-2 ml-4">
                    <Link
                      to={`/callout-reports?calloutId=${callout._id}`}
                      className="btn-primary text-sm flex items-center gap-2"
                    >
                      <DocumentTextIcon className="h-4 w-4" />
                      Write Report
                    </Link>
                    {callout.status === 'active' && (
                      <>
                        {!checkedIn ? (
                          <button
                            onClick={() => {
                              const role = prompt('Enter your role (optional):') || 'member';
                              const notes = prompt('Enter any notes (optional):') || '';
                              checkInMutation.mutate({ calloutId: callout._id, role, notes });
                            }}
                            className="btn-secondary text-sm flex items-center gap-2"
                            disabled={checkInMutation.isLoading}
                          >
                            <CheckCircleIcon className="h-4 w-4" />
                            Check In
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              if (confirm('Check out from this callout?')) {
                                checkOutMutation.mutate(callout._id);
                              }
                            }}
                            className="btn-secondary text-sm flex items-center gap-2"
                            disabled={checkOutMutation.isLoading}
                          >
                            <XCircleIcon className="h-4 w-4" />
                            Check Out
                          </button>
                        )}
                      </>
                    )}
                    <button
                      onClick={() => setViewingCallout(callout)}
                      className="btn-secondary text-sm flex items-center gap-2"
                    >
                      <EyeIcon className="h-4 w-4" />
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="card text-center py-12">
            <ClipboardDocumentListIcon className="mx-auto h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No callouts found</h3>
            <p className="text-gray-500">Callouts will appear here once created.</p>
          </div>
        )}
      </div>

      {/* Create Callout Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleCreateSubmit}>
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900">Create New Callout</h2>
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
                    placeholder="e.g., Search and Rescue - Lost Hiker"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
                    <select name="type" required className="input">
                      <option value="search">Search</option>
                      <option value="rescue">Rescue</option>
                      <option value="recovery">Recovery</option>
                      <option value="assist">Assist</option>
                      <option value="training">Training</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select name="status" className="input" defaultValue="active">
                      <option value="active">Active</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Date & Time</label>
                    <input
                      type="datetime-local"
                      name="endDate"
                      className="input"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location Address</label>
                  <input
                    type="text"
                    name="locationAddress"
                    className="input"
                    placeholder="Enter location address"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location Description</label>
                  <textarea
                    name="locationDescription"
                    rows={2}
                    className="input"
                    placeholder="Additional location details"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Incident Description</label>
                  <textarea
                    name="incidentDescription"
                    rows={4}
                    className="input"
                    placeholder="Describe the incident..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Requesting Agency</label>
                  <input
                    type="text"
                    name="requestingAgency"
                    className="input"
                    placeholder="e.g., Anaconda Police Department"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Contact Name</label>
                    <input
                      type="text"
                      name="contactName"
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Contact Phone</label>
                    <input
                      type="text"
                      name="contactPhone"
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Contact Agency</label>
                    <input
                      type="text"
                      name="contactAgency"
                      className="input"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Attachments</label>
                  <input
                    type="file"
                    name="attachments"
                    multiple
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    className="input"
                  />
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
                  {createMutation.isLoading ? 'Creating...' : 'Create Callout'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Callout Modal */}
      {viewingCallout && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Callout Details</h2>
              <button
                onClick={() => setViewingCallout(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{viewingCallout.title}</h3>
                <p className="text-sm text-gray-500">Callout #{viewingCallout.calloutNumber}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm font-medium text-gray-700">Status:</span>
                  <div>
                    <span className={`px-3 py-1 text-xs font-medium rounded-full border ${getStatusColor(viewingCallout.status)}`}>
                      {viewingCallout.status}
                    </span>
                  </div>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-700">Type:</span>
                  <div>
                    <span className={`px-3 py-1 text-xs font-medium rounded-full ${getTypeColor(viewingCallout.type)}`}>
                      {viewingCallout.type}
                    </span>
                  </div>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-700">Start Date:</span>
                  <div className="text-gray-900">
                    {format(new Date(viewingCallout.startDate), 'MMM d, yyyy h:mm a')}
                  </div>
                </div>
                {viewingCallout.endDate && (
                  <div>
                    <span className="text-sm font-medium text-gray-700">End Date:</span>
                    <div className="text-gray-900">
                      {format(new Date(viewingCallout.endDate), 'MMM d, yyyy h:mm a')}
                    </div>
                  </div>
                )}
              </div>

              {viewingCallout.location && (
                <div>
                  <span className="text-sm font-medium text-gray-700">Location:</span>
                  <div className="text-gray-900 mt-1">
                    {viewingCallout.location.address || viewingCallout.location.description}
                  </div>
                </div>
              )}

              {viewingCallout.incidentDescription && (
                <div>
                  <span className="text-sm font-medium text-gray-700">Incident Description:</span>
                  <div className="text-gray-900 mt-1 whitespace-pre-wrap">
                    {viewingCallout.incidentDescription}
                  </div>
                </div>
              )}

              {viewingCallout.respondingMembers && viewingCallout.respondingMembers.length > 0 && (
                <div>
                  <span className="text-sm font-medium text-gray-700 mb-2 block">Responding Members:</span>
                  <div className="space-y-2">
                    {viewingCallout.respondingMembers.map((member, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-gray-50 p-3 rounded">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {member.member?.firstName} {member.member?.lastName}
                          </p>
                          <p className="text-xs text-gray-500">
                            Role: {member.role || 'Member'} • 
                            Checked in: {format(new Date(member.checkInTime), 'MMM d, h:mm a')}
                            {member.checkOutTime && ` • Checked out: ${format(new Date(member.checkOutTime), 'MMM d, h:mm a')}`}
                          </p>
                        </div>
                        {!member.checkOutTime && (
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                            Active
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {viewingCallout.reports && viewingCallout.reports.length > 0 && (
                <div>
                  <span className="text-sm font-medium text-gray-700 mb-2 block">Attached Reports:</span>
                  <div className="space-y-2">
                    {viewingCallout.reports.map((report) => (
                      <Link
                        key={report._id}
                        to={`/callout-reports/${report._id}`}
                        className="block bg-gray-50 p-3 rounded hover:bg-gray-100 transition-colors"
                      >
                        <p className="text-sm font-medium text-gray-900">{report.title}</p>
                        <p className="text-xs text-gray-500">
                          {report.reportNumber} • {format(new Date(report.createdAt), 'MMM d, yyyy')}
                        </p>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
              <Link
                to={`/callout-reports?calloutId=${viewingCallout._id}`}
                className="btn-primary"
              >
                Write Report
              </Link>
              <button
                onClick={() => setViewingCallout(null)}
                className="btn-secondary"
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

