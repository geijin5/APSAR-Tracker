import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';
import {
  PlusIcon,
  DocumentTextIcon,
  CalendarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  ArrowDownTrayIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import api from '../services/api';

export default function Certificates() {
  const { user } = useAuth();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingCertificate, setEditingCertificate] = useState(null);
  const [viewingCertificate, setViewingCertificate] = useState(null);
  const [filters, setFilters] = useState({
    status: '',
    expiringSoon: false
  });

  const queryClient = useQueryClient();

  // Fetch users for admin/operator/trainer
  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await api.get('/auth/users');
      return response.data;
    },
    enabled: ['admin', 'operator', 'trainer'].includes(user?.role)
  });

  // Fetch certificates
  const { data: certificates, isLoading, error } = useQuery({
    queryKey: ['certificates', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.expiringSoon) params.append('expiringSoon', 'true');
      // Admin, operator, and trainer can see all certificates
      const response = await api.get(`/certificates?${params}`);
      return response.data;
    }
  });

  // Create certificate mutation
  const createMutation = useMutation({
    mutationFn: async (formData) => {
      const response = await api.post('/certificates', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['certificates']);
      setShowCreateForm(false);
    }
  });

  // Update certificate mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, formData }) => {
      const response = await api.put(`/certificates/${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['certificates']);
      setEditingCertificate(null);
    }
  });

  // Delete certificate mutation
  const deleteMutation = useMutation({
    mutationFn: async (certificateId) => {
      await api.delete(`/certificates/${certificateId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['certificates']);
    }
  });

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    createMutation.mutate(formData);
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    updateMutation.mutate({ id: editingCertificate._id, formData });
  };

  const getStatusColor = (status, expiryDate) => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const daysUntilExpiry = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));

    if (daysUntilExpiry < 0) {
      return 'bg-red-100 text-red-800 border-red-300';
    } else if (daysUntilExpiry <= 30) {
      return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    }
    return 'bg-green-100 text-green-800 border-green-300';
  };

  const getStatusIcon = (status, expiryDate) => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const daysUntilExpiry = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));

    if (daysUntilExpiry < 0) {
      return <XCircleIcon className="h-5 w-5" />;
    } else if (daysUntilExpiry <= 30) {
      return <ExclamationTriangleIcon className="h-5 w-5" />;
    }
    return <CheckCircleIcon className="h-5 w-5" />;
  };

  const getDaysUntilExpiry = (expiryDate) => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const days = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
    return days;
  };

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-[400px] text-gray-900 dark:text-gray-100">Loading certificates...</div>;
  }

  if (error) {
    return <div className="text-red-600 dark:text-red-400">Error loading certificates: {error.message}</div>;
  }

  // Filter certificates by user if not admin/operator/trainer
  const visibleCertificates = ['admin', 'operator', 'trainer'].includes(user?.role)
    ? certificates || []
    : (certificates || []).filter(cert => cert.user?._id === user?.id || cert.user === user?.id);

  return (
    <div className="dark:text-gray-100">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Training Certificates</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage and track training certificate expirations</p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="btn-primary flex items-center gap-2"
        >
          <PlusIcon className="h-5 w-5" />
          Add Certificate
        </button>
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="input"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="expiring_soon">Expiring Soon</option>
              <option value="expired">Expired</option>
            </select>
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.expiringSoon}
                onChange={(e) => setFilters({ ...filters, expiringSoon: e.target.checked })}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 dark:border-gray-600 rounded"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Expiring Soon (30 days)</span>
            </label>
          </div>
        </div>
      </div>

      {/* Certificates List */}
      <div className="grid gap-4">
        {visibleCertificates && visibleCertificates.length > 0 ? (
          visibleCertificates.map((certificate) => {
            const daysUntilExpiry = getDaysUntilExpiry(certificate.expiryDate);
            const isExpired = daysUntilExpiry < 0;
            const isExpiringSoon = daysUntilExpiry <= 30 && daysUntilExpiry >= 0;

            return (
              <div key={certificate._id} className="card hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div className={`p-3 rounded-lg border-2 ${getStatusColor(certificate.status, certificate.expiryDate)}`}>
                      {getStatusIcon(certificate.status, certificate.expiryDate)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                            {certificate.name}
                          </h3>
                          {['admin', 'operator', 'trainer'].includes(user?.role) && (
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                              {certificate.user?.firstName} {certificate.user?.lastName}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2 ml-4">
                          <span className={`px-3 py-1 text-xs font-medium rounded-full border ${getStatusColor(certificate.status, certificate.expiryDate)}`}>
                            {isExpired ? 'Expired' : isExpiringSoon ? 'Expiring Soon' : 'Active'}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 dark:text-gray-400 mb-3">
                        <div className="flex items-center gap-1">
                          <DocumentTextIcon className="h-4 w-4" />
                          <span>{certificate.issuingAuthority}</span>
                        </div>
                        {certificate.certificateNumber && (
                          <div>
                            <span className="font-medium">Cert #:</span> {certificate.certificateNumber}
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <CalendarIcon className="h-4 w-4" />
                          <span>Issued: {format(new Date(certificate.issuedDate), 'MMM d, yyyy')}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <ClockIcon className="h-4 w-4" />
                          <span className={isExpired ? 'text-red-600 dark:text-red-400 font-semibold' : isExpiringSoon ? 'text-yellow-600 dark:text-yellow-400 font-semibold' : ''}>
                            {isExpired 
                              ? `Expired ${Math.abs(daysUntilExpiry)} days ago`
                              : `Expires in ${daysUntilExpiry} days`
                            }
                          </span>
                        </div>
                      </div>

                      {certificate.notes && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{certificate.notes}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    {certificate.fileUrl && (
                      <a
                        href={certificate.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-secondary p-2"
                        title="View Certificate"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </a>
                    )}
                    <button
                      onClick={() => setViewingCertificate(certificate)}
                      className="btn-secondary p-2"
                      title="View Details"
                    >
                      <EyeIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setEditingCertificate(certificate)}
                      className="btn-secondary p-2"
                      title="Edit Certificate"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Are you sure you want to delete this certificate?')) {
                          deleteMutation.mutate(certificate._id);
                        }
                      }}
                      className="btn-danger p-2"
                      title="Delete Certificate"
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
          <div className="card text-center py-12">
            <DocumentTextIcon className="mx-auto h-16 w-16 text-gray-400 dark:text-gray-500 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No certificates found</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">Upload your first training certificate to get started.</p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="btn-primary"
            >
              Add Certificate
            </button>
          </div>
        )}
      </div>

      {/* Create Certificate Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleCreateSubmit}>
              <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Add Certificate</h2>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  ×
                </button>
              </div>

              <div className="p-6 space-y-4">
                {['admin', 'operator', 'trainer'].includes(user?.role) && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">User *</label>
                    <select name="userId" className="input" required>
                      <option value="">Select User</option>
                      {users?.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.firstName} {u.lastName} ({u.username})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Certificate Name *</label>
                  <input
                    type="text"
                    name="name"
                    required
                    className="input"
                    placeholder="e.g., First Aid, CPR, Wilderness First Responder"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Issuing Authority *</label>
                    <input
                      type="text"
                      name="issuingAuthority"
                      required
                      className="input"
                      placeholder="e.g., American Red Cross"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Certificate Number</label>
                    <input
                      type="text"
                      name="certificateNumber"
                      className="input"
                      placeholder="Optional"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Issued Date *</label>
                    <input
                      type="date"
                      name="issuedDate"
                      required
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Expiry Date *</label>
                    <input
                      type="date"
                      name="expiryDate"
                      required
                      className="input"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Certificate File</label>
                  <input
                    type="file"
                    name="file"
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    className="input"
                  />
                  <p className="text-xs text-gray-500 mt-1">PDF, images, or documents (max 10MB)</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
                  <textarea
                    name="notes"
                    rows={3}
                    className="input"
                    placeholder="Additional notes or information"
                  />
                </div>
              </div>

              <div className="sticky bottom-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-end gap-3">
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
                  {createMutation.isLoading ? 'Uploading...' : 'Add Certificate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Certificate Modal */}
      {editingCertificate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleEditSubmit}>
              <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Edit Certificate</h2>
                <button
                  type="button"
                  onClick={() => setEditingCertificate(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Certificate Name *</label>
                  <input
                    type="text"
                    name="name"
                    required
                    defaultValue={editingCertificate.name}
                    className="input"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Issuing Authority *</label>
                    <input
                      type="text"
                      name="issuingAuthority"
                      required
                      defaultValue={editingCertificate.issuingAuthority}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Certificate Number</label>
                    <input
                      type="text"
                      name="certificateNumber"
                      defaultValue={editingCertificate.certificateNumber || ''}
                      className="input"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Issued Date *</label>
                    <input
                      type="date"
                      name="issuedDate"
                      required
                      defaultValue={format(new Date(editingCertificate.issuedDate), 'yyyy-MM-dd')}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Expiry Date *</label>
                    <input
                      type="date"
                      name="expiryDate"
                      required
                      defaultValue={format(new Date(editingCertificate.expiryDate), 'yyyy-MM-dd')}
                      className="input"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Update Certificate File (optional)</label>
                  <input
                    type="file"
                    name="file"
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    className="input"
                  />
                  {editingCertificate.fileUrl && (
                    <p className="text-xs text-gray-500 mt-1">
                      Current file: <a href={editingCertificate.fileUrl} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">View</a>
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
                  <textarea
                    name="notes"
                    rows={3}
                    defaultValue={editingCertificate.notes || ''}
                    className="input"
                  />
                </div>
              </div>

              <div className="sticky bottom-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingCertificate(null)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateMutation.isLoading}
                  className="btn-primary"
                >
                  {updateMutation.isLoading ? 'Updating...' : 'Update Certificate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Certificate Modal */}
      {viewingCertificate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Certificate Details</h2>
              <button
                onClick={() => setViewingCertificate(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{viewingCertificate.name}</h3>
                {['admin', 'operator', 'trainer'].includes(user?.role) && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Owner: {viewingCertificate.user?.firstName} {viewingCertificate.user?.lastName}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Issuing Authority:</span>
                  <div className="text-gray-900">{viewingCertificate.issuingAuthority}</div>
                </div>
                {viewingCertificate.certificateNumber && (
                  <div>
                    <span className="font-medium text-gray-700">Certificate Number:</span>
                    <div className="text-gray-900">{viewingCertificate.certificateNumber}</div>
                  </div>
                )}
                <div>
                  <span className="font-medium text-gray-700">Issued Date:</span>
                  <div className="text-gray-900">{format(new Date(viewingCertificate.issuedDate), 'MMM d, yyyy')}</div>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Expiry Date:</span>
                  <div className={`text-gray-900 ${getDaysUntilExpiry(viewingCertificate.expiryDate) < 0 ? 'text-red-600 font-semibold' : ''}`}>
                    {format(new Date(viewingCertificate.expiryDate), 'MMM d, yyyy')}
                  </div>
                </div>
                <div className="col-span-2">
                  <span className="font-medium text-gray-700">Status:</span>
                  <div>
                    <span className={`px-3 py-1 text-xs font-medium rounded-full border ${getStatusColor(viewingCertificate.status, viewingCertificate.expiryDate)}`}>
                      {getDaysUntilExpiry(viewingCertificate.expiryDate) < 0 
                        ? 'Expired' 
                        : getDaysUntilExpiry(viewingCertificate.expiryDate) <= 30 
                        ? 'Expiring Soon' 
                        : 'Active'}
                    </span>
                  </div>
                </div>
                {viewingCertificate.notes && (
                  <div className="col-span-2">
                    <span className="font-medium text-gray-700">Notes:</span>
                    <div className="text-gray-900 mt-1">{viewingCertificate.notes}</div>
                  </div>
                )}
                {viewingCertificate.fileUrl && (
                  <div className="col-span-2">
                    <a
                      href={viewingCertificate.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-primary inline-flex items-center gap-2"
                    >
                      <ArrowDownTrayIcon className="h-4 w-4" />
                      View Certificate File
                    </a>
                  </div>
                )}
              </div>
            </div>

            <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex justify-end">
              <button
                onClick={() => setViewingCertificate(null)}
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

