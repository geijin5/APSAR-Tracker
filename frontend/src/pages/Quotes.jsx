import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PlusIcon, XMarkIcon, TrashIcon, PrinterIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { printDocument, generatePrintableQuote } from '../utils/printUtils.jsx';

export default function Quotes() {
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState(null);
  const queryClient = useQueryClient();

  const { data: quotes, isLoading } = useQuery({
    queryKey: ['quotes'],
    queryFn: async () => {
      const res = await api.get('/quotes');
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

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const res = await api.post('/quotes', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['quotes']);
      setShowForm(false);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const res = await api.delete(`/quotes/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['quotes']);
      setSelectedQuote(null);
    }
  });

  const approveMutation = useMutation({
    mutationFn: async ({ id, status }) => {
      const res = await api.patch(`/quotes/${id}/approve`, { status });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['quotes']);
      setSelectedQuote(null);
    }
  });

  const handleDelete = (e, quoteId) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this quote? This action cannot be undone.')) {
      deleteMutation.mutate(quoteId);
    }
  };

  const handlePrintQuote = (e, quote) => {
    e.preventDefault();
    e.stopPropagation();
    
    const printComponent = generatePrintableQuote(quote);
    printDocument(printComponent, `Quote - ${quote.asset?.name} - ${quote.title}`);
  };

  const handleApprove = (status) => {
    if (window.confirm(`Are you sure you want to ${status} this quote?`)) {
      approveMutation.mutate({ id: selectedQuote._id, status });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      asset: formData.get('asset'),
      vendorName: formData.get('vendorName'),
      vendorContact: {
        name: formData.get('contactName'),
        phone: formData.get('contactPhone'),
        email: formData.get('contactEmail'),
        address: formData.get('contactAddress')
      },
      quoteNumber: formData.get('quoteNumber'),
      description: formData.get('description'),
      totalCost: parseFloat(formData.get('totalCost')) || 0,
      laborCost: parseFloat(formData.get('laborCost')) || 0,
      partsCost: parseFloat(formData.get('partsCost')) || 0,
      materialsCost: parseFloat(formData.get('materialsCost')) || 0,
      estimatedHours: parseFloat(formData.get('estimatedHours')) || 0,
      quoteDate: formData.get('quoteDate'),
      expiryDate: formData.get('expiryDate'),
      notes: formData.get('notes')
    };
    createMutation.mutate(data);
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Maintenance Quotes</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          <PlusIcon className="h-5 w-5" />
          New Quote
        </button>
      </div>

      {showForm && (
        <div className="card mb-6">
          <h2 className="text-xl font-semibold mb-4">Add Maintenance Quote</h2>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Quote Number</label>
                <input type="text" name="quoteNumber" className="w-full border border-gray-300 rounded-lg px-3 py-2" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vendor Name</label>
              <input type="text" name="vendorName" required className="w-full border border-gray-300 rounded-lg px-3 py-2" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Name</label>
                <input type="text" name="contactName" className="w-full border border-gray-300 rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Phone</label>
                <input type="text" name="contactPhone" className="w-full border border-gray-300 rounded-lg px-3 py-2" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Email</label>
                <input type="email" name="contactEmail" className="w-full border border-gray-300 rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Address</label>
                <input type="text" name="contactAddress" className="w-full border border-gray-300 rounded-lg px-3 py-2" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea name="description" rows="3" className="w-full border border-gray-300 rounded-lg px-3 py-2"></textarea>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Total Cost ($)</label>
                <input type="number" step="0.01" name="totalCost" className="w-full border border-gray-300 rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Labor Cost ($)</label>
                <input type="number" step="0.01" name="laborCost" className="w-full border border-gray-300 rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Parts Cost ($)</label>
                <input type="number" step="0.01" name="partsCost" className="w-full border border-gray-300 rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Materials Cost ($)</label>
                <input type="number" step="0.01" name="materialsCost" className="w-full border border-gray-300 rounded-lg px-3 py-2" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Hours</label>
                <input type="number" step="0.1" name="estimatedHours" className="w-full border border-gray-300 rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quote Date</label>
                <input type="date" name="quoteDate" className="w-full border border-gray-300 rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
                <input type="date" name="expiryDate" className="w-full border border-gray-300 rounded-lg px-3 py-2" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea name="notes" rows="2" className="w-full border border-gray-300 rounded-lg px-3 py-2"></textarea>
            </div>

            <div className="flex gap-3">
              <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
                Add Quote
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendor</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Asset</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quote #</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Cost</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {quotes?.map((quote) => (
                <tr key={quote._id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedQuote(quote)}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {quote.vendorName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {quote.asset?.name || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {quote.quoteNumber || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${quote.totalCost?.toFixed(2) || '0.00'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {quote.quoteDate ? new Date(quote.quoteDate).toLocaleDateString() : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      quote.status === 'approved' ? 'bg-green-100 text-green-800' :
                      quote.status === 'rejected' ? 'bg-red-100 text-red-800' :
                      quote.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {quote.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!quotes || quotes.length === 0 && (
            <div className="text-center py-12 text-gray-500">No maintenance quotes found</div>
          )}
        </div>
      </div>

      {/* Quote Detail Modal */}
      {selectedQuote && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Quote Details</h2>
              <button
                onClick={() => setSelectedQuote(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            
            <div className="px-6 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Vendor</h3>
                  <p className="mt-1 text-sm text-gray-900">{selectedQuote.vendorName}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Asset</h3>
                  <p className="mt-1 text-sm text-gray-900">{selectedQuote.asset?.name || 'N/A'}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Quote Number</h3>
                  <p className="mt-1 text-sm text-gray-900">{selectedQuote.quoteNumber || 'N/A'}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Status</h3>
                  <span className={`inline-block mt-1 px-2 py-1 text-xs font-semibold rounded-full ${
                    selectedQuote.status === 'approved' ? 'bg-green-100 text-green-800' :
                    selectedQuote.status === 'rejected' ? 'bg-red-100 text-red-800' :
                    selectedQuote.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {selectedQuote.status}
                  </span>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Quote Date</h3>
                  <p className="mt-1 text-sm text-gray-900">
                    {selectedQuote.quoteDate ? new Date(selectedQuote.quoteDate).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Expiry Date</h3>
                  <p className="mt-1 text-sm text-gray-900">
                    {selectedQuote.expiryDate ? new Date(selectedQuote.expiryDate).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
              </div>

              {selectedQuote.description && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Description</h3>
                  <p className="text-sm text-gray-900 whitespace-pre-wrap">{selectedQuote.description}</p>
                </div>
              )}

              {selectedQuote.vendorContact && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Vendor Contact</h3>
                  <div className="text-sm text-gray-900 space-y-1">
                    {selectedQuote.vendorContact.name && <p>Name: {selectedQuote.vendorContact.name}</p>}
                    {selectedQuote.vendorContact.phone && <p>Phone: {selectedQuote.vendorContact.phone}</p>}
                    {selectedQuote.vendorContact.email && <p>Email: {selectedQuote.vendorContact.email}</p>}
                    {selectedQuote.vendorContact.address && <p>Address: {selectedQuote.vendorContact.address}</p>}
                  </div>
                </div>
              )}

              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-gray-500 mb-3">Cost Breakdown</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Labor Cost:</span>
                    <span className="font-medium">${selectedQuote.laborCost?.toFixed(2) || '0.00'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Parts Cost:</span>
                    <span className="font-medium">${selectedQuote.partsCost?.toFixed(2) || '0.00'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Materials Cost:</span>
                    <span className="font-medium">${selectedQuote.materialsCost?.toFixed(2) || '0.00'}</span>
                  </div>
                  <div className="border-t border-gray-300 pt-2 flex justify-between">
                    <span className="text-lg font-semibold text-gray-900">Total Cost:</span>
                    <span className="text-lg font-bold text-primary-600">${selectedQuote.totalCost?.toFixed(2) || '0.00'}</span>
                  </div>
                  {selectedQuote.estimatedHours && (
                    <div className="flex justify-between pt-2">
                      <span className="text-gray-600">Estimated Hours:</span>
                      <span className="font-medium">{selectedQuote.estimatedHours} hours</span>
                    </div>
                  )}
                </div>
              </div>

              {selectedQuote.notes && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Notes</h3>
                  <p className="text-sm text-gray-900 whitespace-pre-wrap">{selectedQuote.notes}</p>
                </div>
              )}

              {user?.role === 'admin' && (
                <div className="pt-4 border-t border-gray-200 flex gap-3">
                  {selectedQuote.status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleApprove('approved')}
                        disabled={approveMutation.isLoading}
                        className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                      >
                        {approveMutation.isLoading ? 'Processing...' : 'Approve'}
                      </button>
                      <button
                        onClick={() => handleApprove('rejected')}
                        disabled={approveMutation.isLoading}
                        className="flex-1 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => handlePrintQuote({ preventDefault: () => {}, stopPropagation: () => {} }, selectedQuote)}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    <PrinterIcon className="h-5 w-5" />
                    Print Quote
                  </button>
                  <button
                    onClick={(e) => handleDelete(e, selectedQuote._id)}
                    disabled={deleteMutation.isLoading}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50"
                  >
                    <TrashIcon className="h-5 w-5" />
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
