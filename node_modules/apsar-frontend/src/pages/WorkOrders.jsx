import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PlusIcon, ClockIcon, CheckCircleIcon, XCircleIcon, XMarkIcon, TrashIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

export default function WorkOrders() {
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [selectedWorkOrder, setSelectedWorkOrder] = useState(null);
  const queryClient = useQueryClient();

  const { data: workOrders, isLoading } = useQuery({
    queryKey: ['workorders'],
    queryFn: async () => {
      const res = await api.get('/workorders');
      return res.data;
    }
  });

  const { data: assets } = useQuery({
    queryKey: ['assets'],
    queryFn: async () => {
      const res = await api.get('/assets');
      return res.data;
    }
  });

  const { data: categories } = useQuery({
    queryKey: ['categories', 'workorder'],
    queryFn: async () => {
      const res = await api.get('/categories?type=workorder');
      return res.data;
    }
  });

  const createCategoryMutation = useMutation({
    mutationFn: async (data) => {
      const res = await api.post('/categories', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['categories']);
      setShowCategoryForm(false);
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const res = await api.post('/workorders', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['workorders']);
      queryClient.invalidateQueries(['dashboard-stats']);
      setShowForm(false);
    }
  });

  const completeMutation = useMutation({
    mutationFn: async ({ id, notes }) => {
      const res = await api.patch(`/workorders/${id}/complete`, { completedNotes: notes });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['workorders']);
      queryClient.invalidateQueries(['dashboard-stats']);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const res = await api.delete(`/workorders/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['workorders']);
      queryClient.invalidateQueries(['dashboard-stats']);
    }
  });

  const handleDelete = (e, workOrderId) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this work order? This action cannot be undone.')) {
      deleteMutation.mutate(workOrderId);
    }
  };

  const handleCategorySubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      name: formData.get('name'),
      type: 'workorder',
      description: formData.get('description')
    };
    createCategoryMutation.mutate(data);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      asset: formData.get('asset'),
      title: formData.get('title'),
      description: formData.get('description'),
      priority: formData.get('priority') || 'medium',
      category: formData.get('category'),
      scheduledStartDate: formData.get('scheduledStartDate'),
      scheduledEndDate: formData.get('scheduledEndDate')
    };
    createMutation.mutate(data);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'cancelled':
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
      default:
        return <ClockIcon className="h-5 w-5 text-yellow-500" />;
    }
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Work Orders</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          <PlusIcon className="h-5 w-5" />
          New Work Order
        </button>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h2 className="text-xl font-semibold mb-4">Create Work Order</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Asset</label>
                <select name="asset" required className="w-full border border-gray-300 rounded-lg px-3 py-2">
                  <option value="">Select asset...</option>
                  {assets?.map(asset => (
                    <option key={asset._id} value={asset._id}>{asset.name} ({asset.assetNumber})</option>
                  ))}
                </select>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-gray-700">Category</label>
                  <button
                    type="button"
                    onClick={() => setShowCategoryForm(!showCategoryForm)}
                    className="text-sm text-primary-600 hover:text-primary-700"
                  >
                    + New Category
                  </button>
                </div>
                <select name="category" required className="w-full border border-gray-300 rounded-lg px-3 py-2">
                  <option value="repair">Repair</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="inspection">Inspection</option>
                  <option value="upgrade">Upgrade</option>
                  <option value="installation">Installation</option>
                  <option value="other">Other</option>
                  {categories?.map(cat => (
                    <option key={cat._id} value={cat.name}>{cat.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input type="text" name="title" required className="w-full border border-gray-300 rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea name="description" rows="3" required className="w-full border border-gray-300 rounded-lg px-3 py-2"></textarea>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Scheduled Start</label>
                <input type="date" name="scheduledStartDate" className="w-full border border-gray-300 rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Scheduled End</label>
                <input type="date" name="scheduledEndDate" className="w-full border border-gray-300 rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                <select name="priority" className="w-full border border-gray-300 rounded-lg px-3 py-2">
                  <option value="low">Low</option>
                  <option value="medium" selected>Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3">
              <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
                Create Work Order
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {showCategoryForm && (
        <div className="bg-blue-50 p-4 rounded-lg mb-6 border border-blue-200">
          <h3 className="text-lg font-semibold mb-3 text-blue-900">Create New Category</h3>
          <form onSubmit={handleCategorySubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category Name</label>
                <input type="text" name="name" required className="w-full border border-gray-300 rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
                <input type="text" name="description" className="w-full border border-gray-300 rounded-lg px-3 py-2" />
              </div>
            </div>
            <div className="flex gap-3">
              <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
                Create Category
              </button>
              <button type="button" onClick={() => setShowCategoryForm(false)} className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">WO Number</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Asset</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {workOrders?.map((wo) => (
              <tr key={wo._id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedWorkOrder(wo)}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {wo.workOrderNumber}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {wo.asset?.name || 'N/A'}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">{wo.title}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">{wo.category}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                    wo.priority === 'critical' ? 'bg-red-100 text-red-800' :
                    wo.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                    wo.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {wo.priority}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(wo.status)}
                    <span className="text-sm text-gray-900 capitalize">{wo.status}</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-2">
                    {wo.status !== 'completed' && wo.status !== 'cancelled' && (
                      <button
                        onClick={() => completeMutation.mutate({ id: wo._id, notes: 'Completed' })}
                        className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                      >
                        Complete
                      </button>
                    )}
                    {user?.role === 'admin' && (
                      <button
                        onClick={(e) => handleDelete(e, wo._id)}
                        disabled={deleteMutation.isLoading}
                        className="p-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                        title="Delete work order"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!workOrders || workOrders.length === 0 && (
          <div className="text-center py-12 text-gray-500">No work orders found</div>
        )}
      </div>

      {/* Work Order Detail Modal */}
      {selectedWorkOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">{selectedWorkOrder.title}</h2>
              <button
                onClick={() => setSelectedWorkOrder(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            
            <div className="px-6 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Work Order Number</h3>
                  <p className="mt-1 text-sm text-gray-900">{selectedWorkOrder.workOrderNumber}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Asset</h3>
                  <p className="mt-1 text-sm text-gray-900">{selectedWorkOrder.asset?.name || 'N/A'}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Category</h3>
                  <p className="mt-1 text-sm text-gray-900 capitalize">{selectedWorkOrder.category}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Priority</h3>
                  <span className={`inline-block mt-1 px-2 py-1 text-xs font-semibold rounded-full ${
                    selectedWorkOrder.priority === 'critical' ? 'bg-red-100 text-red-800' :
                    selectedWorkOrder.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                    selectedWorkOrder.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {selectedWorkOrder.priority}
                  </span>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Status</h3>
                  <div className="flex items-center gap-2 mt-1">
                    {getStatusIcon(selectedWorkOrder.status)}
                    <span className="text-sm text-gray-900 capitalize">{selectedWorkOrder.status}</span>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Requested By</h3>
                  <p className="mt-1 text-sm text-gray-900">
                    {selectedWorkOrder.requestedBy?.firstName} {selectedWorkOrder.requestedBy?.lastName}
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Description</h3>
                <p className="text-sm text-gray-900 whitespace-pre-wrap">
                  {selectedWorkOrder.description || 'No description provided'}
                </p>
              </div>

              {selectedWorkOrder.notes && selectedWorkOrder.notes.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Notes</h3>
                  <div className="space-y-2">
                    {selectedWorkOrder.notes.map((note, idx) => (
                      <div key={idx} className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-sm text-gray-900">{note.text}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {note.author?.firstName} {note.author?.lastName} • {new Date(note.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedWorkOrder.completedNotes && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Completion Notes</h3>
                  <p className="text-sm text-gray-900 whitespace-pre-wrap">{selectedWorkOrder.completedNotes}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                {selectedWorkOrder.scheduledStartDate && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Scheduled Start</h3>
                    <p className="mt-1 text-sm text-gray-900">
                      {new Date(selectedWorkOrder.scheduledStartDate).toLocaleDateString()}
                    </p>
                  </div>
                )}
                {selectedWorkOrder.actualEndDate && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Completed Date</h3>
                    <p className="mt-1 text-sm text-gray-900">
                      {new Date(selectedWorkOrder.actualEndDate).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
