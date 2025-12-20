import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import {
  PlusIcon,
  DocumentTextIcon,
  PencilIcon,
  EyeIcon,
  CheckCircleIcon,
  ClockIcon,
  PaperClipIcon,
  PrinterIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import api from '../services/api';

export default function CalloutReports() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const calloutId = searchParams.get('calloutId');
  
  const [showCreateForm, setShowCreateForm] = useState(!!calloutId);
  const [editingReport, setEditingReport] = useState(null);
  const [viewingReport, setViewingReport] = useState(null);
  const [filters, setFilters] = useState({
    status: '',
    reportType: '',
    calloutId: calloutId || ''
  });

  const queryClient = useQueryClient();

  // Fetch callouts for dropdown
  const { data: callouts } = useQuery({
    queryKey: ['callouts'],
    queryFn: async () => {
      const response = await api.get('/callouts');
      return response.data;
    }
  });

  // Fetch reports
  const { data: reports, isLoading, error } = useQuery({
    queryKey: ['callout-reports', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.reportType) params.append('reportType', filters.reportType);
      if (filters.calloutId) params.append('calloutId', filters.calloutId);
      const response = await api.get(`/callout-reports?${params}`);
      return response.data;
    }
  });

  // Create report mutation
  const createMutation = useMutation({
    mutationFn: async (formData) => {
      const response = await api.post('/callout-reports', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['callout-reports']);
      setShowCreateForm(false);
    }
  });

  // Update report mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, formData }) => {
      const response = await api.put(`/callout-reports/${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['callout-reports']);
      setEditingReport(null);
    }
  });

  // Submit/Approve mutations
  const submitMutation = useMutation({
    mutationFn: async (reportId) => {
      const response = await api.put(`/callout-reports/${reportId}/submit`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['callout-reports']);
    }
  });

  const approveMutation = useMutation({
    mutationFn: async (reportId) => {
      const response = await api.put(`/callout-reports/${reportId}/approve`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['callout-reports']);
      queryClient.invalidateQueries(['callouts']);
    }
  });

  const reviewMutation = useMutation({
    mutationFn: async (reportId) => {
      const response = await api.put(`/callout-reports/${reportId}/review`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['callout-reports']);
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (reportId) => {
      await api.delete(`/callout-reports/${reportId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['callout-reports']);
    }
  });

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    // Get sections data
    const sections = {
      summary: formData.get('summary') || '',
      timeline: formData.get('timeline') || '',
      actionsTaken: formData.get('actionsTaken') || '',
      personnel: formData.get('personnel') || '',
      equipment: formData.get('equipment') || '',
      weather: formData.get('weather') || '',
      terrain: formData.get('terrain') || '',
      hazards: formData.get('hazards') || '',
      outcomes: formData.get('outcomes') || '',
      recommendations: formData.get('recommendations') || '',
      lessonsLearned: formData.get('lessonsLearned') || ''
    };

    const reportData = new FormData();
    reportData.append('callout', formData.get('callout'));
    reportData.append('title', formData.get('title'));
    reportData.append('reportType', formData.get('reportType'));
    reportData.append('content', formData.get('content'));
    reportData.append('sections', JSON.stringify(sections));

    const attachments = formData.getAll('attachments');
    attachments.forEach(file => {
      if (file instanceof File) {
        reportData.append('attachments', file);
      }
    });

    createMutation.mutate(reportData);
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    const sections = {
      summary: formData.get('summary') || '',
      timeline: formData.get('timeline') || '',
      actionsTaken: formData.get('actionsTaken') || '',
      personnel: formData.get('personnel') || '',
      equipment: formData.get('equipment') || '',
      weather: formData.get('weather') || '',
      terrain: formData.get('terrain') || '',
      hazards: formData.get('hazards') || '',
      outcomes: formData.get('outcomes') || '',
      recommendations: formData.get('recommendations') || '',
      lessonsLearned: formData.get('lessonsLearned') || ''
    };

    const reportData = new FormData();
    reportData.append('title', formData.get('title'));
    reportData.append('reportType', formData.get('reportType'));
    reportData.append('content', formData.get('content'));
    reportData.append('sections', JSON.stringify(sections));

    const attachments = formData.getAll('attachments');
    attachments.forEach(file => {
      if (file instanceof File) {
        reportData.append('attachments', file);
      }
    });

    updateMutation.mutate({ id: editingReport._id, formData: reportData });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'submitted':
        return 'bg-yellow-100 text-yellow-800';
      case 'reviewed':
        return 'bg-blue-100 text-blue-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'archived':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const canEdit = (report) => {
    if (!report) return false;
    const isAuthor = report.writtenBy?._id === user?.id || report.writtenBy === user?.id;
    const isAdminOrOperator = ['admin', 'operator'].includes(user?.role);
    return isAuthor || (isAdminOrOperator && report.status !== 'approved');
  };

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-[400px]">Loading reports...</div>;
  }

  if (error) {
    return <div className="text-red-600">Error loading reports: {error.message}</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Callout Reports</h1>
          <p className="text-sm text-gray-500 mt-1">Write and manage callout reports for legal documentation</p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="btn-primary flex items-center gap-2"
        >
          <PlusIcon className="h-5 w-5" />
          New Report
        </button>
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <h3 className="text-lg font-semibold mb-4">Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="input"
            >
              <option value="">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="submitted">Submitted</option>
              <option value="reviewed">Reviewed</option>
              <option value="approved">Approved</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Report Type</label>
            <select
              value={filters.reportType}
              onChange={(e) => setFilters({ ...filters, reportType: e.target.value })}
              className="input"
            >
              <option value="">All Types</option>
              <option value="incident">Incident</option>
              <option value="after_action">After Action</option>
              <option value="safety">Safety</option>
              <option value="equipment">Equipment</option>
              <option value="personnel">Personnel</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Callout</label>
            <select
              value={filters.calloutId}
              onChange={(e) => setFilters({ ...filters, calloutId: e.target.value })}
              className="input"
            >
              <option value="">All Callouts</option>
              {callouts?.map(callout => (
                <option key={callout._id} value={callout._id}>
                  {callout.calloutNumber} - {callout.title}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Reports List */}
      <div className="grid gap-4">
        {reports && reports.length > 0 ? (
          reports.map((report) => (
            <div key={report._id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {report.title}
                      </h3>
                      <p className="text-sm text-gray-500">{report.reportNumber}</p>
                    </div>
                    <span className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(report.status)}`}>
                      {report.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 mb-3">
                    <div>
                      <span className="font-medium">Callout:</span> {report.callout?.calloutNumber || 'N/A'}
                    </div>
                    <div>
                      <span className="font-medium">Type:</span> {report.reportType}
                    </div>
                    <div>
                      <span className="font-medium">Written by:</span> {report.writtenBy?.firstName} {report.writtenBy?.lastName}
                    </div>
                    <div>
                      <span className="font-medium">Date:</span> {format(new Date(report.createdAt), 'MMM d, yyyy')}
                    </div>
                  </div>

                  <p className="text-sm text-gray-600 line-clamp-2">
                    {report.content}
                  </p>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => setViewingReport(report)}
                    className="btn-secondary p-2"
                    title="View Report"
                  >
                    <EyeIcon className="h-4 w-4" />
                  </button>
                  {canEdit(report) && (
                    <button
                      onClick={() => setEditingReport(report)}
                      className="btn-secondary p-2"
                      title="Edit Report"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                  )}
                  {report.status === 'draft' && report.writtenBy?._id === user?.id && (
                    <button
                      onClick={() => {
                        if (confirm('Submit this report for review?')) {
                          submitMutation.mutate(report._id);
                        }
                      }}
                      className="btn-primary text-sm"
                      disabled={submitMutation.isLoading}
                    >
                      Submit
                    </button>
                  )}
                  {['admin', 'operator'].includes(user?.role) && report.status === 'submitted' && (
                    <button
                      onClick={() => reviewMutation.mutate(report._id)}
                      className="btn-secondary text-sm"
                      disabled={reviewMutation.isLoading}
                    >
                      Review
                    </button>
                  )}
                  {['admin', 'operator'].includes(user?.role) && report.status === 'reviewed' && (
                    <button
                      onClick={() => {
                        if (confirm('Approve this report? It will be attached to the callout.')) {
                          approveMutation.mutate(report._id);
                        }
                      }}
                      className="btn-primary text-sm"
                      disabled={approveMutation.isLoading}
                    >
                      Approve
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="card text-center py-12">
            <DocumentTextIcon className="mx-auto h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No reports found</h3>
            <p className="text-gray-500 mb-4">Create your first callout report to get started.</p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="btn-primary"
            >
              New Report
            </button>
          </div>
        )}
      </div>

      {/* Create Report Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleCreateSubmit}>
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900">Write Callout Report</h2>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Callout *</label>
                    <select name="callout" required className="input" defaultValue={calloutId || ''}>
                      <option value="">Select Callout</option>
                      {callouts?.filter(c => c.status === 'active' || c.status === 'completed').map(callout => (
                        <option key={callout._id} value={callout._id}>
                          {callout.calloutNumber} - {callout.title}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Report Type *</label>
                    <select name="reportType" required className="input">
                      <option value="incident">Incident</option>
                      <option value="after_action">After Action</option>
                      <option value="safety">Safety</option>
                      <option value="equipment">Equipment</option>
                      <option value="personnel">Personnel</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Report Title *</label>
                  <input
                    type="text"
                    name="title"
                    required
                    className="input"
                    placeholder="e.g., Search and Rescue Incident Report"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Report Content *</label>
                  <textarea
                    name="content"
                    required
                    rows={10}
                    className="input"
                    placeholder="Write your detailed report here. This will serve as legal documentation."
                  />
                </div>

                {/* Structured Sections */}
                <div className="border-t pt-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Structured Sections (Optional)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Summary</label>
                      <textarea name="summary" rows={3} className="input" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Timeline</label>
                      <textarea name="timeline" rows={3} className="input" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Actions Taken</label>
                      <textarea name="actionsTaken" rows={3} className="input" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Personnel</label>
                      <textarea name="personnel" rows={3} className="input" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Equipment</label>
                      <textarea name="equipment" rows={3} className="input" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Weather</label>
                      <textarea name="weather" rows={3} className="input" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Terrain</label>
                      <textarea name="terrain" rows={3} className="input" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Hazards</label>
                      <textarea name="hazards" rows={3} className="input" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Outcomes</label>
                      <textarea name="outcomes" rows={3} className="input" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Recommendations</label>
                      <textarea name="recommendations" rows={3} className="input" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Lessons Learned</label>
                      <textarea name="lessonsLearned" rows={3} className="input" />
                    </div>
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
                  <p className="text-xs text-gray-500 mt-1">PDF, images, or documents (max 10MB each)</p>
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
                  {createMutation.isLoading ? 'Creating...' : 'Create Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Report Modal - Similar structure but with existing data */}
      {editingReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleEditSubmit}>
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900">Edit Report</h2>
                <button
                  type="button"
                  onClick={() => setEditingReport(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Report Type</label>
                    <select name="reportType" defaultValue={editingReport.reportType} className="input">
                      <option value="incident">Incident</option>
                      <option value="after_action">After Action</option>
                      <option value="safety">Safety</option>
                      <option value="equipment">Equipment</option>
                      <option value="personnel">Personnel</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Report Title *</label>
                  <input
                    type="text"
                    name="title"
                    required
                    defaultValue={editingReport.title}
                    className="input"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Report Content *</label>
                  <textarea
                    name="content"
                    required
                    rows={10}
                    defaultValue={editingReport.content}
                    className="input"
                  />
                </div>

                {/* Structured Sections with existing data */}
                <div className="border-t pt-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Structured Sections</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Summary</label>
                      <textarea name="summary" rows={3} defaultValue={editingReport.sections?.summary || ''} className="input" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Timeline</label>
                      <textarea name="timeline" rows={3} defaultValue={editingReport.sections?.timeline || ''} className="input" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Actions Taken</label>
                      <textarea name="actionsTaken" rows={3} defaultValue={editingReport.sections?.actionsTaken || ''} className="input" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Personnel</label>
                      <textarea name="personnel" rows={3} defaultValue={editingReport.sections?.personnel || ''} className="input" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Equipment</label>
                      <textarea name="equipment" rows={3} defaultValue={editingReport.sections?.equipment || ''} className="input" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Weather</label>
                      <textarea name="weather" rows={3} defaultValue={editingReport.sections?.weather || ''} className="input" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Terrain</label>
                      <textarea name="terrain" rows={3} defaultValue={editingReport.sections?.terrain || ''} className="input" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Hazards</label>
                      <textarea name="hazards" rows={3} defaultValue={editingReport.sections?.hazards || ''} className="input" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Outcomes</label>
                      <textarea name="outcomes" rows={3} defaultValue={editingReport.sections?.outcomes || ''} className="input" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Recommendations</label>
                      <textarea name="recommendations" rows={3} defaultValue={editingReport.sections?.recommendations || ''} className="input" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Lessons Learned</label>
                      <textarea name="lessonsLearned" rows={3} defaultValue={editingReport.sections?.lessonsLearned || ''} className="input" />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Add Attachments</label>
                  <input
                    type="file"
                    name="attachments"
                    multiple
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    className="input"
                  />
                  {editingReport.attachments && editingReport.attachments.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {editingReport.attachments.map((att, idx) => (
                        <div key={idx} className="text-sm text-gray-600">
                          📎 {att.name} <a href={att.url} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">View</a>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingReport(null)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateMutation.isLoading}
                  className="btn-primary"
                >
                  {updateMutation.isLoading ? 'Updating...' : 'Update Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Report Modal */}
      {viewingReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Report Details</h2>
              <button
                onClick={() => setViewingReport(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{viewingReport.title}</h3>
                <p className="text-sm text-gray-500">Report #{viewingReport.reportNumber}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Callout:</span>
                  <div className="text-gray-900">{viewingReport.callout?.calloutNumber} - {viewingReport.callout?.title}</div>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Status:</span>
                  <div>
                    <span className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(viewingReport.status)}`}>
                      {viewingReport.status}
                    </span>
                  </div>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Written by:</span>
                  <div className="text-gray-900">{viewingReport.writtenBy?.firstName} {viewingReport.writtenBy?.lastName}</div>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Date:</span>
                  <div className="text-gray-900">{format(new Date(viewingReport.createdAt), 'MMM d, yyyy h:mm a')}</div>
                </div>
              </div>

              <div>
                <span className="text-sm font-medium text-gray-700 block mb-2">Report Content:</span>
                <div className="text-gray-900 whitespace-pre-wrap bg-gray-50 p-4 rounded-lg">
                  {viewingReport.content}
                </div>
              </div>

              {viewingReport.sections && Object.keys(viewingReport.sections).some(key => viewingReport.sections[key]) && (
                <div>
                  <span className="text-sm font-medium text-gray-700 block mb-2">Structured Sections:</span>
                  <div className="space-y-3">
                    {viewingReport.sections.summary && (
                      <div>
                        <span className="text-sm font-semibold text-gray-700">Summary:</span>
                        <p className="text-gray-900 mt-1 whitespace-pre-wrap">{viewingReport.sections.summary}</p>
                      </div>
                    )}
                    {viewingReport.sections.timeline && (
                      <div>
                        <span className="text-sm font-semibold text-gray-700">Timeline:</span>
                        <p className="text-gray-900 mt-1 whitespace-pre-wrap">{viewingReport.sections.timeline}</p>
                      </div>
                    )}
                    {viewingReport.sections.actionsTaken && (
                      <div>
                        <span className="text-sm font-semibold text-gray-700">Actions Taken:</span>
                        <p className="text-gray-900 mt-1 whitespace-pre-wrap">{viewingReport.sections.actionsTaken}</p>
                      </div>
                    )}
                    {viewingReport.sections.personnel && (
                      <div>
                        <span className="text-sm font-semibold text-gray-700">Personnel:</span>
                        <p className="text-gray-900 mt-1 whitespace-pre-wrap">{viewingReport.sections.personnel}</p>
                      </div>
                    )}
                    {viewingReport.sections.equipment && (
                      <div>
                        <span className="text-sm font-semibold text-gray-700">Equipment:</span>
                        <p className="text-gray-900 mt-1 whitespace-pre-wrap">{viewingReport.sections.equipment}</p>
                      </div>
                    )}
                    {viewingReport.sections.weather && (
                      <div>
                        <span className="text-sm font-semibold text-gray-700">Weather:</span>
                        <p className="text-gray-900 mt-1 whitespace-pre-wrap">{viewingReport.sections.weather}</p>
                      </div>
                    )}
                    {viewingReport.sections.terrain && (
                      <div>
                        <span className="text-sm font-semibold text-gray-700">Terrain:</span>
                        <p className="text-gray-900 mt-1 whitespace-pre-wrap">{viewingReport.sections.terrain}</p>
                      </div>
                    )}
                    {viewingReport.sections.hazards && (
                      <div>
                        <span className="text-sm font-semibold text-gray-700">Hazards:</span>
                        <p className="text-gray-900 mt-1 whitespace-pre-wrap">{viewingReport.sections.hazards}</p>
                      </div>
                    )}
                    {viewingReport.sections.outcomes && (
                      <div>
                        <span className="text-sm font-semibold text-gray-700">Outcomes:</span>
                        <p className="text-gray-900 mt-1 whitespace-pre-wrap">{viewingReport.sections.outcomes}</p>
                      </div>
                    )}
                    {viewingReport.sections.recommendations && (
                      <div>
                        <span className="text-sm font-semibold text-gray-700">Recommendations:</span>
                        <p className="text-gray-900 mt-1 whitespace-pre-wrap">{viewingReport.sections.recommendations}</p>
                      </div>
                    )}
                    {viewingReport.sections.lessonsLearned && (
                      <div>
                        <span className="text-sm font-semibold text-gray-700">Lessons Learned:</span>
                        <p className="text-gray-900 mt-1 whitespace-pre-wrap">{viewingReport.sections.lessonsLearned}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {viewingReport.attachments && viewingReport.attachments.length > 0 && (
                <div>
                  <span className="text-sm font-medium text-gray-700 block mb-2">Attachments:</span>
                  <div className="space-y-2">
                    {viewingReport.attachments.map((att, idx) => (
                      <a
                        key={idx}
                        href={att.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-sm text-primary-600 hover:underline"
                      >
                        📎 {att.name}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
              {canEdit(viewingReport) && (
                <button
                  onClick={() => {
                    setViewingReport(null);
                    setEditingReport(viewingReport);
                  }}
                  className="btn-secondary"
                >
                  Edit
                </button>
              )}
              <button
                onClick={() => setViewingReport(null)}
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

