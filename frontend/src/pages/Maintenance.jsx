import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PlusIcon, ClockIcon, CheckCircleIcon, XCircleIcon, XMarkIcon, TrashIcon, PrinterIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import Checklist from '../components/Checklist';
import { printDocument, generatePrintableMaintenanceRecord } from '../utils/printUtils';

export default function Maintenance() {
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [selectedMaintenanceTemplate, setSelectedMaintenanceTemplate] = useState('');
  const [checklist, setChecklist] = useState([]);
  const [createdByName, setCreatedByName] = useState('');
  const [currentDateTime, setCurrentDateTime] = useState({
    date: '',
    time: ''
  });
  const queryClient = useQueryClient();

  // Auto-fill current date and time when form opens
  useEffect(() => {
    if (showForm) {
      const now = new Date();
      setCurrentDateTime({
        date: now.toLocaleDateString(),
        time: now.toLocaleTimeString()
      });
      // Reset name field when form opens
      setCreatedByName('');
      setSelectedMaintenanceTemplate('');
    }
  }, [showForm]);

  const handleMaintenanceTemplateChange = (templateId) => {
    setSelectedMaintenanceTemplate(templateId);
    const template = maintenanceTemplates?.find(t => t._id === templateId);
    if (template) {
      // Auto-fill form fields from template
      const form = document.querySelector('form[data-maintenance-form]');
      if (form) {
        form.type.value = template.type;
        form.title.value = template.name;
        form.description.value = template.description || '';
        form.priority.value = template.priority || 'medium';
      }
      
      // Auto-select associated checklist template if available
      if (template.checklistTemplate) {
        setSelectedTemplate(template.checklistTemplate._id || template.checklistTemplate);
      }
    }
  };

  const { data: records, isLoading } = useQuery({
    queryKey: ['maintenance'],
    queryFn: async () => {
      const res = await api.get('/maintenance');
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

  const { data: checklistTemplates } = useQuery({
    queryKey: ['checklistTemplates'],
    queryFn: async () => {
      const res = await api.get('/checklists/templates');
      return res.data;
    }
  });

  const { data: maintenanceTemplates } = useQuery({
    queryKey: ['maintenanceTemplates'],
    queryFn: async () => {
      const res = await api.get('/maintenance-templates');
      return res.data;
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const res = await api.post('/maintenance', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['maintenance']);
      queryClient.invalidateQueries(['dashboard-stats']);
      setShowForm(false);
    }
  });

  const completeMutation = useMutation({
    mutationFn: async (id) => {
      const res = await api.patch(`/maintenance/${id}/complete`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['maintenance']);
      queryClient.invalidateQueries(['dashboard-stats']);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const res = await api.delete(`/maintenance/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['maintenance']);
      queryClient.invalidateQueries(['dashboard-stats']);
    }
  });

  const handleDelete = (e, recordId) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this maintenance record? This action cannot be undone.')) {
      deleteMutation.mutate(recordId);
    }
  };

  const handlePrintRecord = (e, record) => {
    e.preventDefault();
    e.stopPropagation();
    
    const printComponent = generatePrintableMaintenanceRecord(record);
    printDocument(printComponent, `Maintenance Record - ${record.asset?.name} - ${record.title}`);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      asset: formData.get('asset'),
      type: formData.get('type'),
      title: formData.get('title'),
      description: formData.get('description'),
      scheduledDate: formData.get('scheduledDate'),
      dueDate: formData.get('dueDate'),
      priority: formData.get('priority') || 'medium',
      totalCost: parseFloat(formData.get('totalCost')) || 0,
      checklist: checklist,
      checklistTemplate: selectedTemplate || undefined,
      ...(user?.role === 'viewer' && { createdByName: formData.get('createdByName') })
    };
    createMutation.mutate(data);
  };

  const handleTemplateChange = (templateId) => {
    setSelectedTemplate(templateId);
    const template = checklistTemplates?.find(t => t._id === templateId);
    if (template) {
      const templateItems = template.items.map(item => ({
        item: item.title,
        completed: false,
        notes: '',
        category: item.category,
        required: item.required,
        order: item.order,
        description: item.description
      }));
      setChecklist(templateItems);
    } else {
      setChecklist([]);
    }
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
        <h1 className="text-3xl font-bold text-gray-900">Maintenance Records</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          <PlusIcon className="h-5 w-5" />
          New Maintenance Record
        </button>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h2 className="text-xl font-semibold mb-4">Create Maintenance Record</h2>
          <form onSubmit={handleSubmit} data-maintenance-form className="space-y-4">
            {/* Template Selection */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-blue-900 mb-3">Quick Start with Template (Optional)</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Maintenance Template</label>
                <select 
                  value={selectedMaintenanceTemplate}
                  onChange={(e) => handleMaintenanceTemplateChange(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Choose a template to auto-fill...</option>
                  {maintenanceTemplates?.map(template => (
                    <option key={template._id} value={template._id}>
                      {template.name} ({template.type})
                    </option>
                  ))}
                </select>
              </div>
            </div>

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
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select name="type" required className="w-full border border-gray-300 rounded-lg px-3 py-2">
                  <option value="preventive">Preventive</option>
                  <option value="corrective">Corrective</option>
                  <option value="inspection">Inspection</option>
                  <option value="calibration">Calibration</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input type="text" name="title" required className="w-full border border-gray-300 rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea name="description" rows="3" className="w-full border border-gray-300 rounded-lg px-3 py-2"></textarea>
            </div>

            {/* Name field and auto-fill date/time for viewer users */}
            {user?.role === 'viewer' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-sm font-medium text-blue-900 mb-3">Creator Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Your Name *</label>
                    <input 
                      type="text" 
                      name="createdByName" 
                      required
                      value={createdByName}
                      onChange={(e) => setCreatedByName(e.target.value)}
                      placeholder="Enter your full name"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-1 focus:ring-blue-500 focus:border-blue-500" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date Created</label>
                    <input 
                      type="text" 
                      value={currentDateTime.date}
                      readOnly
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-50 text-gray-600"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Time Created</label>
                    <input 
                      type="text" 
                      value={currentDateTime.time}
                      readOnly
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-50 text-gray-600"
                    />
                  </div>
                </div>
              </div>
            )}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Scheduled Date</label>
                <input type="date" name="scheduledDate" className="w-full border border-gray-300 rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                <input type="date" name="dueDate" className="w-full border border-gray-300 rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                <select name="priority" className="w-full border border-gray-300 rounded-lg px-3 py-2">
                  <option value="low">Low</option>
                  <option value="medium" selected>Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Total Cost ($)</label>
              <input type="number" step="0.01" name="totalCost" className="w-full border border-gray-300 rounded-lg px-3 py-2" placeholder="0.00" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Checklist Template (Optional)</label>
              <select 
                value={selectedTemplate}
                onChange={(e) => handleTemplateChange(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              >
                <option value="">Select a checklist template...</option>
                {checklistTemplates?.map(template => (
                  <option key={template._id} value={template._id}>
                    {template.name} ({template.type})
                  </option>
                ))}
              </select>
            </div>
            
            {checklist.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Checklist Items</label>
                <Checklist 
                  checklist={checklist}
                  onChecklistChange={setChecklist}
                  showProgress={true}
                />
              </div>
            )}
            <div className="flex gap-3">
              <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
                Create Record
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400">
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Asset</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Scheduled</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {records?.map((record) => (
              <tr key={record._id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedRecord(record)}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {record.asset?.name || 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{record.type}</td>
                <td className="px-6 py-4 text-sm text-gray-900">{record.title}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {record.scheduledDate ? new Date(record.scheduledDate).toLocaleDateString() : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {record.dueDate ? new Date(record.dueDate).toLocaleDateString() : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                    record.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                    record.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                    record.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {record.priority}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(record.status)}
                    <span className="text-sm text-gray-900 capitalize">{record.status}</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-2">
                    {record.status !== 'completed' && record.status !== 'cancelled' && (
                      <button
                        onClick={() => completeMutation.mutate(record._id)}
                        className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                      >
                        Complete
                      </button>
                    )}
                    <button
                      onClick={(e) => handlePrintRecord(e, record)}
                      className="p-1 text-green-600 hover:text-green-700 hover:bg-green-50 rounded transition-colors"
                      title="Print maintenance record"
                    >
                      <PrinterIcon className="h-5 w-5" />
                    </button>
                    {user?.role === 'admin' && (
                      <button
                        onClick={(e) => handleDelete(e, record._id)}
                        disabled={deleteMutation.isLoading}
                        className="p-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                        title="Delete maintenance record"
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
        {!records || records.length === 0 && (
          <div className="text-center py-12 text-gray-500">No maintenance records found</div>
        )}
      </div>

      {/* Maintenance Record Detail Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">{selectedRecord.title}</h2>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handlePrintRecord({ preventDefault: () => {}, stopPropagation: () => {} }, selectedRecord)}
                  className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <PrinterIcon className="h-4 w-4 mr-2" />
                  Print Record
                </button>
                <button
                  onClick={() => setSelectedRecord(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
            </div>
            
            <div className="px-6 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Asset</h3>
                  <p className="mt-1 text-sm text-gray-900">{selectedRecord.asset?.name || 'N/A'}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Type</h3>
                  <p className="mt-1 text-sm text-gray-900 capitalize">{selectedRecord.type}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Status</h3>
                  <div className="flex items-center gap-2 mt-1">
                    {getStatusIcon(selectedRecord.status)}
                    <span className="text-sm text-gray-900 capitalize">{selectedRecord.status}</span>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Priority</h3>
                  <span className={`inline-block mt-1 px-2 py-1 text-xs font-semibold rounded-full ${
                    selectedRecord.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                    selectedRecord.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                    selectedRecord.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {selectedRecord.priority}
                  </span>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Scheduled Date</h3>
                  <p className="mt-1 text-sm text-gray-900">
                    {selectedRecord.scheduledDate ? new Date(selectedRecord.scheduledDate).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Due Date</h3>
                  <p className="mt-1 text-sm text-gray-900">
                    {selectedRecord.dueDate ? new Date(selectedRecord.dueDate).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
                {selectedRecord.performedBy && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Performed By</h3>
                    <p className="mt-1 text-sm text-gray-900">
                      {selectedRecord.performedBy.firstName} {selectedRecord.performedBy.lastName}
                    </p>
                  </div>
                )}
                {selectedRecord.completedDate && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Completed Date</h3>
                    <p className="mt-1 text-sm text-gray-900">
                      {new Date(selectedRecord.completedDate).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Description</h3>
                <p className="text-sm text-gray-900 whitespace-pre-wrap">
                  {selectedRecord.description || 'No description provided'}
                </p>
              </div>

              {selectedRecord.notes && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Notes</h3>
                  <p className="text-sm text-gray-900 whitespace-pre-wrap">{selectedRecord.notes}</p>
                </div>
              )}

              {selectedRecord.checklist && selectedRecord.checklist.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Checklist</h3>
                  <Checklist 
                    checklist={selectedRecord.checklist}
                    readonly={true}
                    showProgress={true}
                    templateData={selectedRecord.checklistTemplate}
                  />
                </div>
              )}

              {selectedRecord.partsUsed && selectedRecord.partsUsed.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Parts Used</h3>
                  <div className="space-y-2">
                    {selectedRecord.partsUsed.map((part, idx) => (
                      <div key={idx} className="bg-gray-50 p-3 rounded-lg">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-sm">{part.name}</p>
                            {part.partNumber && (
                              <p className="text-xs text-gray-500">Part #: {part.partNumber}</p>
                            )}
                            <p className="text-xs text-gray-500">Qty: {part.quantity}</p>
                          </div>
                          {part.totalCost && (
                            <p className="text-sm font-semibold">${part.totalCost.toFixed(2)}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(selectedRecord.laborHours || selectedRecord.totalCost) && (
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                  {selectedRecord.laborHours && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Labor Hours</h3>
                      <p className="mt-1 text-sm text-gray-900">{selectedRecord.laborHours}</p>
                    </div>
                  )}
                  {selectedRecord.totalCost && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Total Cost</h3>
                      <p className="mt-1 text-sm text-gray-900 font-semibold">${selectedRecord.totalCost.toFixed(2)}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
