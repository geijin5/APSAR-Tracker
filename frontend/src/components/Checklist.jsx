import React, { useState, useEffect } from 'react';
import { CheckIcon, XMarkIcon, ClipboardDocumentListIcon } from '@heroicons/react/24/outline';
import { getCurrentDate, getCurrentTime } from '../utils/dateUtils';

const Checklist = ({ 
  checklist = [], 
  onChecklistChange, 
  readonly = false, 
  showProgress = true,
  templateData = null,
  showCompletion = false,
  onCompletionChange = null
}) => {
  const [items, setItems] = useState(checklist);
  const [completionData, setCompletionData] = useState({
    completedBy: '',
    completedDate: '',
    completedTime: '',
    notes: ''
  });

  useEffect(() => {
    setItems(checklist);
  }, [checklist]);

  // Auto-fill date and time when all required items are completed
  useEffect(() => {
    if (showCompletion && !readonly) {
      const requiredItems = items.filter(item => item.required);
      const allRequiredCompleted = requiredItems.length > 0 && requiredItems.every(item => item.completed);
      
      if (allRequiredCompleted && !completionData.completedDate) {
        const newCompletionData = {
          ...completionData,
          completedDate: getCurrentDate(),
          completedTime: getCurrentTime()
        };
        setCompletionData(newCompletionData);
        onCompletionChange?.(newCompletionData);
      }
    }
  }, [items, showCompletion, readonly, completionData, onCompletionChange]);

  const handleCompletionDataChange = (field, value) => {
    const updatedData = {
      ...completionData,
      [field]: value
    };
    setCompletionData(updatedData);
    onCompletionChange?.(updatedData);
  };

  const handleItemToggle = (index) => {
    if (readonly) return;
    
    const updatedItems = [...items];
    updatedItems[index] = {
      ...updatedItems[index],
      completed: !updatedItems[index].completed
    };
    setItems(updatedItems);
    onChecklistChange?.(updatedItems);
  };

  const handleNotesChange = (index, notes) => {
    if (readonly) return;
    
    const updatedItems = [...items];
    updatedItems[index] = {
      ...updatedItems[index],
      notes: notes
    };
    setItems(updatedItems);
    onChecklistChange?.(updatedItems);
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'safety':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'operational':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'communication':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'equipment':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'documentation':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const completedCount = items.filter(item => item.completed).length;
  const totalCount = items.length;
  const progressPercentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  if (!items || items.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <ClipboardDocumentListIcon className="h-12 w-12 mx-auto mb-2 text-gray-400" />
        <p>No checklist items available</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {showProgress && (
        <div className="px-4 py-3 border-b border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              Progress: {completedCount}/{totalCount} items completed
            </span>
            <span className="text-sm text-gray-500">
              {Math.round(progressPercentage)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>
      )}

      <div className="p-4">
        {templateData && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <h3 className="font-medium text-gray-900">{templateData.name}</h3>
            <p className="text-sm text-gray-600 mt-1">{templateData.description}</p>
          </div>
        )}

        <div className="space-y-3">
          {items
            .sort((a, b) => (a.order || 0) - (b.order || 0))
            .map((item, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-3">
                <div className="flex items-start space-x-3">
                  <button
                    onClick={() => handleItemToggle(index)}
                    disabled={readonly}
                    className={`flex-shrink-0 w-5 h-5 mt-0.5 rounded border-2 flex items-center justify-center transition-colors ${
                      item.completed
                        ? 'bg-green-500 border-green-500 text-white'
                        : 'border-gray-300 hover:border-blue-500'
                    } ${readonly ? 'cursor-default' : 'cursor-pointer'}`}
                  >
                    {item.completed && <CheckIcon className="h-3 w-3" />}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className={`text-sm font-medium ${
                          item.completed ? 'line-through text-gray-500' : 'text-gray-900'
                        }`}>
                          {item.item || item.title}
                          {item.required && (
                            <span className="ml-1 text-red-500 text-xs">*</span>
                          )}
                        </p>
                        
                        {item.description && (
                          <p className="text-xs text-gray-500 mt-1">
                            {item.description}
                          </p>
                        )}
                      </div>

                      {item.category && (
                        <span className={`ml-2 inline-flex px-2 py-1 text-xs font-medium rounded-full border ${getCategoryColor(item.category)}`}>
                          {item.category}
                        </span>
                      )}
                    </div>

                    {!readonly && (
                      <div className="mt-2">
                        <textarea
                          value={item.notes || ''}
                          onChange={(e) => handleNotesChange(index, e.target.value)}
                          placeholder="Add notes (optional)..."
                          className="w-full text-xs border border-gray-300 rounded px-2 py-1 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                          rows="2"
                        />
                      </div>
                    )}

                    {readonly && item.notes && (
                      <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-700">
                        <strong>Notes:</strong> {item.notes}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
        </div>

        {!readonly && (
          <div className="mt-4 text-xs text-gray-500 italic">
            * Required items must be completed
          </div>
        )}

        {/* Completion Section */}
        {showCompletion && !readonly && (
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="text-sm font-semibold text-blue-900 mb-3">Checklist Completion</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Completed By *
                </label>
                <input
                  type="text"
                  value={completionData.completedBy}
                  onChange={(e) => handleCompletionDataChange('completedBy', e.target.value)}
                  placeholder="Enter your full name"
                  className="w-full text-sm border border-gray-300 rounded px-3 py-2 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Date Completed
                  </label>
                  <input
                    type="text"
                    value={completionData.completedDate}
                    readOnly
                    className="w-full text-sm border border-gray-300 rounded px-3 py-2 bg-gray-50 text-gray-600"
                    placeholder="Auto-filled"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Time Completed
                  </label>
                  <input
                    type="text"
                    value={completionData.completedTime}
                    readOnly
                    className="w-full text-sm border border-gray-300 rounded px-3 py-2 bg-gray-50 text-gray-600"
                    placeholder="Auto-filled"
                  />
                </div>
              </div>
            </div>

            <div className="mt-3">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Completion Notes (Optional)
              </label>
              <textarea
                value={completionData.notes}
                onChange={(e) => handleCompletionDataChange('notes', e.target.value)}
                placeholder="Add any additional notes about this checklist completion..."
                className="w-full text-sm border border-gray-300 rounded px-3 py-2 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                rows="3"
              />
            </div>

            {completionData.completedDate && (
              <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded text-xs text-green-800">
                ✅ <strong>Auto-completed:</strong> Date and time filled automatically when all required items were checked.
              </div>
            )}
          </div>
        )}

        {/* Readonly Completion Display */}
        {showCompletion && readonly && completionData.completedBy && (
          <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Completion Details</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-700">Completed By:</span>
                <p className="text-gray-900">{completionData.completedBy}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Date:</span>
                <p className="text-gray-900">{completionData.completedDate}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Time:</span>
                <p className="text-gray-900">{completionData.completedTime}</p>
              </div>
            </div>
            {completionData.notes && (
              <div className="mt-3">
                <span className="font-medium text-gray-700">Notes:</span>
                <p className="text-gray-900 mt-1">{completionData.notes}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Checklist;
