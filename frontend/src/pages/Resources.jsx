import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import {
  PlusIcon,
  VideoCameraIcon,
  DocumentTextIcon,
  ListBulletIcon,
  MapPinIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  XMarkIcon,
  CloudArrowUpIcon,
  LinkIcon
} from '@heroicons/react/24/outline';
import api from '../services/api';
import { format } from 'date-fns';

export default function Resources() {
  const { user } = useAuth();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingResource, setEditingResource] = useState(null);
  const [viewingResource, setViewingResource] = useState(null);
  const [filters, setFilters] = useState({
    type: '',
    category: '',
    search: ''
  });
  const [categories, setCategories] = useState([]);
  const [resourceType, setResourceType] = useState('');

  const queryClient = useQueryClient();
  const isAdmin = user?.role === 'admin';

  // Fetch resources
  const { data: resources, isLoading, error } = useQuery({
    queryKey: ['resources', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.type) params.append('type', filters.type);
      if (filters.category) params.append('category', filters.category);
      if (filters.search) params.append('search', filters.search);
      const response = await api.get(`/resources?${params}`);
      return response.data;
    }
  });

  // Fetch categories
  useQuery({
    queryKey: ['resource-categories'],
    queryFn: async () => {
      const response = await api.get('/resources/stats/categories');
      setCategories(response.data);
      return response.data;
    }
  });

  // Create resource mutation
  const createMutation = useMutation({
    mutationFn: async (formData) => {
      const response = await api.post('/resources', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['resources']);
      setShowCreateForm(false);
    }
  });

  // Update resource mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, formData }) => {
      const response = await api.put(`/resources/${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['resources']);
      setEditingResource(null);
    }
  });

  // Delete resource mutation
  const deleteMutation = useMutation({
    mutationFn: async (resourceId) => {
      await api.delete(`/resources/${resourceId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['resources']);
    }
  });

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    // Handle list items
    if (formData.get('type') === 'list') {
      const listItemsText = formData.get('listItems');
      if (listItemsText) {
        const items = listItemsText.split('\n').filter(item => item.trim()).map((item, index) => ({
          text: item.trim(),
          order: index
        }));
        formData.set('listItems', JSON.stringify(items));
      }
    }

    // Handle map coordinates
    if (formData.get('type') === 'map') {
      const lat = formData.get('latitude');
      const lng = formData.get('longitude');
      if (lat && lng) {
        formData.set('coordinates', JSON.stringify({ lat: parseFloat(lat), lng: parseFloat(lng) }));
      }
      formData.delete('latitude');
      formData.delete('longitude');
    }

    // Handle tags
    const tagsText = formData.get('tags');
    if (tagsText) {
      formData.set('tags', JSON.stringify(tagsText.split(',').map(t => t.trim())));
    }

    createMutation.mutate(formData);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    formData.append('_id', editingResource._id);

    // Handle list items
    if (formData.get('type') === 'list') {
      const listItemsText = formData.get('listItems');
      if (listItemsText) {
        const items = listItemsText.split('\n').filter(item => item.trim()).map((item, index) => ({
          text: item.trim(),
          order: index
        }));
        formData.set('listItems', JSON.stringify(items));
      }
    }

    // Handle map coordinates
    if (formData.get('type') === 'map') {
      const lat = formData.get('latitude');
      const lng = formData.get('longitude');
      if (lat && lng) {
        formData.set('coordinates', JSON.stringify({ lat: parseFloat(lat), lng: parseFloat(lng) }));
      } else {
        formData.set('coordinates', '');
      }
      formData.delete('latitude');
      formData.delete('longitude');
    }

    // Handle tags
    const tagsText = formData.get('tags');
    if (tagsText) {
      formData.set('tags', JSON.stringify(tagsText.split(',').map(t => t.trim())));
    }

    updateMutation.mutate({ id: editingResource._id, formData });
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'video':
        return VideoCameraIcon;
      case 'form':
        return DocumentTextIcon;
      case 'list':
        return ListBulletIcon;
      case 'map':
        return MapPinIcon;
      default:
        return DocumentTextIcon;
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'video':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-300 dark:border-red-700';
      case 'form':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-300 dark:border-blue-700';
      case 'list':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-300 dark:border-green-700';
      case 'map':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 border-purple-300 dark:border-purple-700';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600';
    }
  };

  const filteredResources = resources || [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Resources</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Videos, forms, lists, and maps for members to review
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => {
              setShowCreateForm(true);
              setResourceType('');
            }}
            className="btn-primary flex items-center gap-2"
          >
            <PlusIcon className="h-5 w-5" />
            Add Resource
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="card bg-white dark:bg-gray-800 p-4 border border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Type
            </label>
            <select
              value={filters.type}
              onChange={(e) => setFilters({ ...filters, type: e.target.value })}
              className="input"
            >
              <option value="">All Types</option>
              <option value="video">Video</option>
              <option value="form">Form</option>
              <option value="list">List</option>
              <option value="map">Map</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Category
            </label>
            <select
              value={filters.category}
              onChange={(e) => setFilters({ ...filters, category: e.target.value })}
              className="input"
            >
              <option value="">All Categories</option>
              {categories.map((cat, idx) => (
                <option key={idx} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Search
            </label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              placeholder="Search resources..."
              className="input"
            />
          </div>
        </div>
      </div>

      {/* Resources Grid */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">Loading resources...</div>
      ) : error ? (
        <div className="text-center py-12 text-red-500">Error loading resources</div>
      ) : filteredResources.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          No resources found. {isAdmin && 'Click "Add Resource" to get started.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredResources.map((resource) => {
            const TypeIcon = getTypeIcon(resource.type);
            return (
              <div
                key={resource._id}
                className="card bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${getTypeColor(resource.type)}`}>
                      <TypeIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                        {resource.title}
                      </h3>
                      {resource.category && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {resource.category}
                        </span>
                      )}
                    </div>
                  </div>
                  {isAdmin && (
                    <div className="flex gap-1">
                  <button
                    onClick={() => {
                      setEditingResource(resource);
                      setResourceType(resource.type);
                    }}
                    className="p-1 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded"
                    title="Edit"
                  >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Are you sure you want to delete this resource?')) {
                            deleteMutation.mutate(resource._id);
                          }
                        }}
                        className="p-1 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
                        title="Delete"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>

                {resource.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 line-clamp-2">
                    {resource.description}
                  </p>
                )}

                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setViewingResource(resource)}
                    className="btn-secondary flex items-center gap-2 text-sm"
                  >
                    <EyeIcon className="h-4 w-4" />
                    View
                  </button>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {resource.views?.length || 0} views
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Resource Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-700">
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Add Resource</h3>
              <button
                onClick={() => {
                  setShowCreateForm(false);
                  setResourceType('');
                }}
                className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  name="title"
                  required
                  className="input"
                  placeholder="Resource title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  name="description"
                  rows="3"
                  className="input"
                  placeholder="Resource description"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Type *
                </label>
                <select 
                  name="type" 
                  required 
                  className="input"
                  value={resourceType}
                  onChange={(e) => setResourceType(e.target.value)}
                >
                  <option value="">Select type</option>
                  <option value="video">Video</option>
                  <option value="form">Form</option>
                  <option value="list">List</option>
                  <option value="map">Map</option>
                </select>
              </div>

              {resourceType === 'video' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Video URL (YouTube, Vimeo, etc.)
                  </label>
                  <input
                    type="url"
                    name="videoUrl"
                    className="input"
                    placeholder="https://youtube.com/watch?v=..."
                  />
                </div>
              )}

              {resourceType === 'map' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Map URL (Google Maps, etc.)
                    </label>
                    <input
                      type="url"
                      name="mapUrl"
                      className="input"
                      placeholder="https://maps.google.com/..."
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Latitude
                      </label>
                      <input
                        type="number"
                        step="any"
                        name="latitude"
                        className="input"
                        placeholder="45.1234"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Longitude
                      </label>
                      <input
                        type="number"
                        step="any"
                        name="longitude"
                        className="input"
                        placeholder="-112.5678"
                      />
                    </div>
                  </div>
                </>
              )}

              {resourceType !== 'list' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    File {resourceType === 'map' && '(Map image)'}
                  </label>
                  <input
                    type="file"
                    name="file"
                    className="input"
                    accept={resourceType === 'map' ? '.jpg,.jpeg,.png,.gif,.pdf' : '.pdf,.doc,.docx,.xls,.xlsx,.txt,.mp4,.mov,.avi'}
                  />
                </div>
              )}

              {resourceType === 'list' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    List Items (one per line)
                  </label>
                  <textarea
                    name="listItems"
                    rows="6"
                    className="input font-mono text-sm"
                    placeholder="Item 1&#10;Item 2&#10;Item 3"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Category
                </label>
                <input
                  type="text"
                  name="category"
                  className="input"
                  placeholder="e.g., Training, Safety, Procedures"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  name="tags"
                  className="input"
                  placeholder="tag1, tag2, tag3"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
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
                  {createMutation.isLoading ? 'Creating...' : 'Create Resource'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Resource Modal */}
      {editingResource && (
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-700">
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Edit Resource</h3>
              <button
                onClick={() => setEditingResource(null)}
                className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  name="title"
                  required
                  defaultValue={editingResource.title}
                  className="input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  name="description"
                  rows="3"
                  defaultValue={editingResource.description}
                  className="input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Type *
                </label>
                <select 
                  name="type" 
                  required 
                  defaultValue={editingResource.type}
                  className="input"
                  onChange={(e) => setResourceType(e.target.value)}
                >
                  <option value="video">Video</option>
                  <option value="form">Form</option>
                  <option value="list">List</option>
                  <option value="map">Map</option>
                </select>
              </div>

              {(editingResource.type === 'video' || resourceType === 'video') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Video URL
                  </label>
                  <input
                    type="url"
                    name="videoUrl"
                    defaultValue={editingResource.videoUrl}
                    className="input"
                  />
                </div>
              )}

              {(editingResource.type === 'map' || resourceType === 'map') && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Map URL
                    </label>
                    <input
                      type="url"
                      name="mapUrl"
                      defaultValue={editingResource.mapUrl}
                      className="input"
                      placeholder="https://maps.google.com/..."
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Latitude
                      </label>
                      <input
                        type="number"
                        step="any"
                        name="latitude"
                        defaultValue={editingResource.coordinates?.lat}
                        className="input"
                        placeholder="45.1234"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Longitude
                      </label>
                      <input
                        type="number"
                        step="any"
                        name="longitude"
                        defaultValue={editingResource.coordinates?.lng}
                        className="input"
                        placeholder="-112.5678"
                      />
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  File (leave empty to keep current) {(editingResource.type === 'map' || resourceType === 'map') && '(Map image)'}
                </label>
                <input
                  type="file"
                  name="file"
                  className="input"
                  accept={(editingResource.type === 'map' || resourceType === 'map') ? '.jpg,.jpeg,.png,.gif,.pdf' : '.pdf,.doc,.docx,.xls,.xlsx,.txt,.mp4,.mov,.avi'}
                />
                {editingResource.file && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Current: {editingResource.file.name}
                  </p>
                )}
              </div>

              {(editingResource.type === 'list' || resourceType === 'list') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    List Items (one per line)
                  </label>
                  <textarea
                    name="listItems"
                    rows="6"
                    defaultValue={editingResource.listItems?.map(item => item.text).join('\n')}
                    className="input font-mono text-sm"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Category
                </label>
                <input
                  type="text"
                  name="category"
                  defaultValue={editingResource.category}
                  className="input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  name="tags"
                  defaultValue={editingResource.tags?.join(', ')}
                  className="input"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => {
                    setEditingResource(null);
                    setResourceType('');
                  }}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateMutation.isLoading}
                  className="btn-primary"
                >
                  {updateMutation.isLoading ? 'Updating...' : 'Update Resource'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Resource Modal */}
      {viewingResource && (
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-700">
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {viewingResource.title}
              </h3>
              <button
                onClick={() => setViewingResource(null)}
                className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getTypeColor(viewingResource.type)}`}>
                  {viewingResource.type.charAt(0).toUpperCase() + viewingResource.type.slice(1)}
                </span>
                {viewingResource.category && (
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {viewingResource.category}
                  </span>
                )}
              </div>

              {viewingResource.description && (
                <p className="text-gray-700 dark:text-gray-300">{viewingResource.description}</p>
              )}

              {viewingResource.type === 'video' && viewingResource.videoUrl && (
                <div className="aspect-video bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                  <a
                    href={viewingResource.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary flex items-center gap-2"
                  >
                    <LinkIcon className="h-5 w-5" />
                    Watch Video
                  </a>
                </div>
              )}

              {viewingResource.type === 'video' && viewingResource.file && (
                <div>
                  <a
                    href={viewingResource.file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary flex items-center gap-2 inline-flex"
                  >
                    <CloudArrowUpIcon className="h-5 w-5" />
                    Download Video
                  </a>
                </div>
              )}

              {viewingResource.type === 'form' && viewingResource.file && (
                <div>
                  <a
                    href={viewingResource.file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary flex items-center gap-2 inline-flex"
                  >
                    <DocumentTextIcon className="h-5 w-5" />
                    View/Download Form
                  </a>
                </div>
              )}

              {viewingResource.type === 'map' && (
                <div className="space-y-4">
                  {viewingResource.mapUrl && (
                    <div>
                      <a
                        href={viewingResource.mapUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-primary flex items-center gap-2 inline-flex"
                      >
                        <MapPinIcon className="h-5 w-5" />
                        Open Map
                      </a>
                    </div>
                  )}
                  
                  {viewingResource.coordinates && viewingResource.coordinates.lat && viewingResource.coordinates.lng && (
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Coordinates</h4>
                      <div className="text-sm text-gray-700 dark:text-gray-300">
                        <p><strong>Latitude:</strong> {viewingResource.coordinates.lat}</p>
                        <p><strong>Longitude:</strong> {viewingResource.coordinates.lng}</p>
                        <a
                          href={`https://www.google.com/maps?q=${viewingResource.coordinates.lat},${viewingResource.coordinates.lng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary-600 dark:text-primary-400 hover:underline mt-2 inline-block"
                        >
                          View on Google Maps →
                        </a>
                      </div>
                    </div>
                  )}

                  {viewingResource.file && (
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Map Image</h4>
                      <a
                        href={viewingResource.file.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-primary flex items-center gap-2 inline-flex"
                      >
                        <CloudArrowUpIcon className="h-5 w-5" />
                        View/Download Map Image
                      </a>
                    </div>
                  )}
                </div>
              )}

              {viewingResource.type === 'list' && viewingResource.listItems && (
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">List Items</h4>
                  <ol className="list-decimal list-inside space-y-2">
                    {viewingResource.listItems
                      .sort((a, b) => (a.order || 0) - (b.order || 0))
                      .map((item, idx) => (
                        <li key={idx} className="text-gray-700 dark:text-gray-300">
                          {item.text}
                        </li>
                      ))}
                  </ol>
                </div>
              )}

              {viewingResource.tags && viewingResource.tags.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Tags</h4>
                  <div className="flex flex-wrap gap-2">
                    {viewingResource.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-sm"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="text-sm text-gray-500 dark:text-gray-400 pt-4 border-t border-gray-200 dark:border-gray-700">
                <p>
                  Created by {viewingResource.createdBy?.firstName} {viewingResource.createdBy?.lastName} on{' '}
                  {format(new Date(viewingResource.createdAt), 'MMMM d, yyyy')}
                </p>
                <p className="mt-1">
                  {viewingResource.views?.length || 0} view(s)
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

