import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PlusIcon, ClipboardDocumentListIcon, EyeIcon, PencilIcon, TrashIcon, XMarkIcon, PrinterIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import Checklist from '../components/Checklist';
import { printDocument, generatePrintableChecklist } from '../utils/printUtils.jsx';

export default function Checklists() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedType, setSelectedType] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [viewingTemplate, setViewingTemplate] = useState(null);
  const [editingTemplate, setEditingTemplate] = useState(null);

  const { data: templates, isLoading } = useQuery({
    queryKey: ['checklistTemplates'],
    queryFn: async () => {
      const response = await api.get('/checklists/templates');
      return response.data;
    }
  });

  const { data: types } = useQuery({
    queryKey: ['checklistTypes'],
    queryFn: async () => {
      const response = await api.get('/checklists/types');
      return response.data;
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (templateId) => {
      await api.delete(`/checklists/templates/${templateId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['checklistTemplates']);
    }
  });

  const handleDelete = (e, template) => {
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to delete the "${template.name}" checklist template?`)) {
      deleteMutation.mutate(template._id);
    }
  };

  const handlePrintTemplate = (e, template) => {
    e.stopPropagation();
    
    const checklistItems = template.items?.map(item => ({
      item: item.title,
      completed: false,
      notes: '',
      category: item.category,
      required: item.required,
      order: item.order,
      description: item.description
    })) || [];

    const headerInfo = {
      'Template Type': template.type.replace('_', ' '),
      'Category': template.category.replace('_', ' '),
      'Total Items': template.items?.length || 0,
      'Required Items': template.items?.filter(item => item.required).length || 0
    };

    const printComponent = generatePrintableChecklist(checklistItems, template, headerInfo);
    printDocument(printComponent, `Checklist - ${template.name}`);
  };

  const filteredTemplates = templates?.filter(template => {
    const matchesType = selectedType === 'all' || template.type === selectedType;
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    return matchesType && matchesCategory;
  });

  const getTypeColor = (type) => {
    switch (type) {
      case 'callout':
        return 'bg-red-100 text-red-800';
      case 'maintenance':
        return 'bg-blue-100 text-blue-800';
      case 'vehicle_inspection':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'vehicle_ground':
      case 'vehicle_air':
      case 'vehicle_marine':
        return 'bg-orange-100 text-orange-800';
      case 'communications':
        return 'bg-purple-100 text-purple-800';
      case 'medical':
        return 'bg-rose-100 text-rose-800';
      case 'climbing':
        return 'bg-yellow-100 text-yellow-800';
      case 'navigation':
        return 'bg-indigo-100 text-indigo-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Checklist Templates</h1>
        {(user?.role === 'admin' || user?.role === 'operator') && (
          <button
            onClick={() => setShowCreateForm(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            New Template
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Type</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Types</option>
              {types?.map(type => (
                <option key={type.type} value={type.type}>{type.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Categories</option>
              <option value="general">General</option>
              <option value="vehicle_ground">Ground Vehicle</option>
              <option value="vehicle_air">Aircraft</option>
              <option value="vehicle_marine">Marine Vehicle</option>
              <option value="communications">Communications</option>
              <option value="medical">Medical</option>
              <option value="climbing">Climbing</option>
              <option value="navigation">Navigation</option>
              <option value="specialized">Specialized</option>
            </select>
          </div>
        </div>
      </div>

      {/* Templates as Big Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredTemplates?.map((template) => (
          <button
            key={template._id}
            onClick={() => setViewingTemplate(template)}
            className="group bg-white rounded-xl shadow-md border-2 border-gray-200 hover:border-blue-500 hover:shadow-lg transition-all duration-200 p-8 text-left relative overflow-hidden"
          >
            {/* Background Pattern */}
            <div className="absolute top-0 right-0 w-32 h-32 opacity-5 transform rotate-12 translate-x-8 -translate-y-8">
              <ClipboardDocumentListIcon className="w-full h-full text-blue-500" />
            </div>

            {/* Delete Button */}
            {(user?.role === 'admin' || user?.role === 'operator') && (
              <button
                onClick={(e) => handleDelete(e, template)}
                disabled={deleteMutation.isLoading}
                className="absolute top-4 right-4 text-red-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed z-10"
                title="Delete template"
              >
                <TrashIcon className="h-5 w-5" />
              </button>
            )}

            {/* Content */}
            <div className="relative">
              <div className="flex items-start mb-4">
                <div className="flex-shrink-0 mr-4">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-blue-100 border-2 border-blue-200">
                    <ClipboardDocumentListIcon className="h-8 w-8 text-blue-600" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                    {template.name}
                  </h3>
                  <div className="flex flex-wrap gap-2 mb-3">
                    <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${getTypeColor(template.type)}`}>
                      {template.type.replace('_', ' ')}
                    </span>
                    <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${getCategoryColor(template.category)}`}>
                      {template.category.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-gray-600 mb-4 line-clamp-2">
                {template.description}
              </p>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-6 text-sm text-gray-500">
                  <span className="flex items-center">
                    <span className="font-medium text-gray-900">{template.items?.length || 0}</span>
                    <span className="ml-1">total items</span>
                  </span>
                  <span className="flex items-center">
                    <span className="font-medium text-red-600">{template.items?.filter(item => item.required).length || 0}</span>
                    <span className="ml-1">required</span>
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => handlePrintTemplate(e, template)}
                    className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-md transition-colors"
                    title="Print checklist"
                  >
                    <PrinterIcon className="h-4 w-4 mr-1" />
                    Print
                  </button>
                  
                  {(user?.role === 'admin' || user?.role === 'operator') && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingTemplate(template);
                      }}
                      className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                    >
                      <PencilIcon className="h-4 w-4 mr-1" />
                      Edit
                    </button>
                  )}
                </div>
              </div>

              {/* Quick Action Indicator */}
              <div className="mt-4 flex items-center text-sm text-blue-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                <EyeIcon className="h-4 w-4 mr-2" />
                Click to view checklist details
              </div>
            </div>
          </button>
        ))}
      </div>

      {filteredTemplates?.length === 0 && (
        <div className="text-center py-12">
          <ClipboardDocumentListIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No checklist templates</h3>
          <p className="mt-1 text-sm text-gray-500">
            {templates?.length === 0 
              ? 'Get started by creating a new checklist template.'
              : 'Try adjusting your filters to see more templates.'
            }
          </p>
        </div>
      )}

      {/* View Template Modal */}
      {viewingTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{viewingTemplate.name}</h2>
                <p className="text-sm text-gray-600 mt-1">{viewingTemplate.description}</p>
              </div>
              <button
                onClick={() => setViewingTemplate(null)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            
            <div className="px-6 py-4">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Type</h3>
                  <span className={`inline-flex mt-1 px-2 py-1 text-xs font-medium rounded-full ${getTypeColor(viewingTemplate.type)}`}>
                    {viewingTemplate.type.replace('_', ' ')}
                  </span>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Category</h3>
                  <span className={`inline-flex mt-1 px-2 py-1 text-xs font-medium rounded-full ${getCategoryColor(viewingTemplate.category)}`}>
                    {viewingTemplate.category.replace('_', ' ')}
                  </span>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Total Items</h3>
                  <p className="mt-1 text-sm text-gray-900">{viewingTemplate.items?.length || 0}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Required Items</h3>
                  <p className="mt-1 text-sm text-gray-900">
                    {viewingTemplate.items?.filter(item => item.required).length || 0}
                  </p>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Checklist Preview</h3>
                  <button
                    onClick={() => handlePrintTemplate({ stopPropagation: () => {} }, viewingTemplate)}
                    className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <PrinterIcon className="h-4 w-4 mr-2" />
                    Print Checklist
                  </button>
                </div>
                <Checklist 
                  checklist={viewingTemplate.items?.map(item => ({
                    item: item.title,
                    completed: false,
                    notes: '',
                    category: item.category,
                    required: item.required,
                    order: item.order,
                    description: item.description
                  })) || []}
                  readonly={true}
                  showProgress={false}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Template Modal */}
      {editingTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Edit Template</h2>
              <button
                onClick={() => setEditingTemplate(null)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            
            <div className="px-6 py-4">
              <div className="text-center py-12">
                <PencilIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Template Editing</h3>
                <p className="text-gray-500 mb-4">
                  Template editing functionality is coming soon. For now, you can view template details and create new templates.
                </p>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={() => setEditingTemplate(null)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      setEditingTemplate(null);
                      setViewingTemplate(editingTemplate);
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    View Template Instead
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Template Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Create New Template</h2>
              <button
                onClick={() => setShowCreateForm(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            
            <div className="px-6 py-4">
              <div className="text-center py-12">
                <PlusIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Template Creation</h3>
                <p className="text-gray-500 mb-4">
                  Template creation functionality is coming soon. The system currently includes 8 comprehensive pre-built templates covering callouts, maintenance, and vehicle inspections.
                </p>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={() => setShowCreateForm(false)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      setShowCreateForm(false);
                      // Show the first template as an example
                      if (templates?.length > 0) {
                        setViewingTemplate(templates[0]);
                      }
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    View Example Template
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
