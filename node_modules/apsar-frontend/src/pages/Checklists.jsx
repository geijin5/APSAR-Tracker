import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PlusIcon, ClipboardDocumentListIcon, EyeIcon, PencilIcon, TrashIcon, XMarkIcon, PrinterIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import Checklist from '../components/Checklist';
import { printDocument, generatePrintableChecklist } from '../utils/printUtils';

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

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const response = await api.put(`/checklists/templates/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['checklistTemplates']);
      setEditingTemplate(null);
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/checklists/templates', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['checklistTemplates']);
      setShowCreateForm(false);
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
        return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300';
      case 'maintenance':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300';
      case 'vehicle_inspection':
        return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300';
    }
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'vehicle_ground':
      case 'vehicle_air':
      case 'vehicle_marine':
        return 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300';
      case 'communications':
        return 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300';
      case 'medical':
        return 'bg-rose-100 dark:bg-rose-900/30 text-rose-800 dark:text-rose-300';
      case 'climbing':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300';
      case 'navigation':
        return 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300';
    }
  };

  if (isLoading) {
    return <div className="text-gray-900 dark:text-gray-100">Loading...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Checklist Templates</h1>
        {(user?.role === 'admin' || user?.role === 'officer') && (
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
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow mb-6 border border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Filter by Type</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400"
            >
              <option value="all">All Types</option>
              {types?.map(type => (
                <option key={type.type} value={type.type}>{type.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Filter by Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400"
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
            className="group bg-white dark:bg-gray-800 rounded-xl shadow-md border-2 border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-400 hover:shadow-lg transition-all duration-200 p-8 text-left relative overflow-hidden"
          >
            {/* Background Pattern */}
            <div className="absolute top-0 right-0 w-32 h-32 opacity-5 transform rotate-12 translate-x-8 -translate-y-8">
              <ClipboardDocumentListIcon className="w-full h-full text-blue-500" />
            </div>

            {/* Delete Button */}
            {(user?.role === 'admin' || user?.role === 'officer') && (
              <button
                onClick={(e) => handleDelete(e, template)}
                disabled={deleteMutation.isLoading}
                className="absolute top-4 right-4 text-red-400 dark:text-red-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 p-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed z-10"
                title="Delete template"
              >
                <TrashIcon className="h-5 w-5" />
              </button>
            )}

            {/* Content */}
            <div className="relative">
              <div className="flex items-start mb-4">
                <div className="flex-shrink-0 mr-4">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-blue-100 dark:bg-blue-900/30 border-2 border-blue-200 dark:border-blue-800">
                    <ClipboardDocumentListIcon className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
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

              <p className="text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                {template.description}
              </p>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-6 text-sm text-gray-500 dark:text-gray-400">
                  <span className="flex items-center">
                    <span className="font-medium text-gray-900 dark:text-gray-100">{template.items?.length || 0}</span>
                    <span className="ml-1">total items</span>
                  </span>
                  <span className="flex items-center">
                    <span className="font-medium text-red-600 dark:text-red-400">{template.items?.filter(item => item.required).length || 0}</span>
                    <span className="ml-1">required</span>
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => handlePrintTemplate(e, template)}
                    className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-md transition-colors"
                    title="Print checklist"
                  >
                    <PrinterIcon className="h-4 w-4 mr-1" />
                    Print
                  </button>
                  
                  {(user?.role === 'admin' || user?.role === 'officer') && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingTemplate(template);
                      }}
                      className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-colors"
                    >
                      <PencilIcon className="h-4 w-4 mr-1" />
                      Edit
                    </button>
                  )}
                </div>
              </div>

              {/* Quick Action Indicator */}
              <div className="mt-4 flex items-center text-sm text-blue-600 dark:text-blue-400 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                <EyeIcon className="h-4 w-4 mr-2" />
                Click to view checklist details
              </div>
            </div>
          </button>
        ))}
      </div>

      {filteredTemplates?.length === 0 && (
        <div className="text-center py-12">
          <ClipboardDocumentListIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No checklist templates</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
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
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-700">
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{viewingTemplate.name}</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{viewingTemplate.description}</p>
              </div>
              <button
                onClick={() => setViewingTemplate(null)}
                className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 p-1"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            
            <div className="px-6 py-4">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Type</h3>
                  <span className={`inline-flex mt-1 px-2 py-1 text-xs font-medium rounded-full ${getTypeColor(viewingTemplate.type)}`}>
                    {viewingTemplate.type.replace('_', ' ')}
                  </span>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Category</h3>
                  <span className={`inline-flex mt-1 px-2 py-1 text-xs font-medium rounded-full ${getCategoryColor(viewingTemplate.category)}`}>
                    {viewingTemplate.category.replace('_', ' ')}
                  </span>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Items</h3>
                  <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">{viewingTemplate.items?.length || 0}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Required Items</h3>
                  <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                    {viewingTemplate.items?.filter(item => item.required).length || 0}
                  </p>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Checklist Preview</h3>
                  <button
                    onClick={() => handlePrintTemplate({ stopPropagation: () => {} }, viewingTemplate)}
                    className="inline-flex items-center px-4 py-2 bg-green-600 dark:bg-green-700 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 transition-colors"
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
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-700">
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Edit Template</h2>
              <button
                onClick={() => setEditingTemplate(null)}
                className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 p-1"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              
              // Collect all item data
              const itemsData = [];
              let index = 0;
              while (formData.has(`item-title-${index}`)) {
                const title = formData.get(`item-title-${index}`);
                if (title?.trim()) {
                  itemsData.push({
                    title: title.trim(),
                    description: formData.get(`item-description-${index}`)?.trim() || '',
                    category: formData.get(`item-category-${index}`) || 'general',
                    required: formData.has(`item-required-${index}`),
                    order: index
                  });
                }
                index++;
              }
              
              const data = {
                name: formData.get('name'),
                description: formData.get('description'),
                type: formData.get('type'),
                category: formData.get('category'),
                items: itemsData
              };
              
              updateMutation.mutate({ id: editingTemplate._id, data });
            }} className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Template Name *</label>
                  <input 
                    type="text" 
                    name="name" 
                    required
                    defaultValue={editingTemplate.name}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type *</label>
                  <select 
                    name="type" 
                    required
                    defaultValue={editingTemplate.type}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    <option value="callout">Callout Equipment Check</option>
                    <option value="maintenance">Regular Maintenance</option>
                    <option value="vehicle_inspection">Vehicle Inspection</option>
                    <option value="general">General Checklist</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <textarea 
                  name="description" 
                  rows="2"
                  defaultValue={editingTemplate.description}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                  placeholder="Brief description of this template..."
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Checklist Items</h3>
                </div>
                
                <div className="space-y-3">
                  {editingTemplate.items?.map((item, index) => (
                    <div key={index} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                      <div className="grid grid-cols-12 gap-3">
                        <div className="col-span-5">
                          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Item Title *</label>
                          <input 
                            type="text" 
                            name={`item-title-${index}`} 
                            required
                            defaultValue={item.title}
                            className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" 
                          />
                        </div>
                        <div className="col-span-3">
                          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
                          <select 
                            name={`item-category-${index}`}
                            defaultValue={item.category}
                            className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          >
                            <option value="general">General</option>
                            <option value="safety">Safety</option>
                            <option value="operational">Operational</option>
                            <option value="communication">Communication</option>
                            <option value="equipment">Equipment</option>
                            <option value="documentation">Documentation</option>
                          </select>
                        </div>
                        <div className="col-span-4 flex items-center justify-between">
                          <label className="flex items-center text-sm text-gray-700 dark:text-gray-300">
                            <input 
                              type="checkbox" 
                              name={`item-required-${index}`}
                              defaultChecked={item.required}
                              className="mr-2" 
                            />
                            Required
                          </label>
                        </div>
                        <div className="col-span-12">
                          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                          <input 
                            type="text" 
                            name={`item-description-${index}`}
                            defaultValue={item.description}
                            className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500" 
                            placeholder="Optional description..."
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setEditingTemplate(null)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateMutation.isLoading}
                  className="px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50"
                >
                  {updateMutation.isLoading ? 'Saving...' : 'Save Template'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Template Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-700">
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Create New Template</h2>
              <button
                onClick={() => setShowCreateForm(false)}
                className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 p-1"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            
            <div className="px-6 py-4">
              <div className="text-center py-12">
                <PlusIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Template Creation</h3>
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  Template creation functionality is coming soon. The system currently includes 8 comprehensive pre-built templates covering callouts, maintenance, and vehicle inspections.
                </p>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={() => setShowCreateForm(false)}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
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
                    className="px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
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
