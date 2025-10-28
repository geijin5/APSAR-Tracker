import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChartBarIcon, DocumentTextIcon, CurrencyDollarIcon, PrinterIcon } from '@heroicons/react/24/outline';
import api from '../services/api';
import { printDocument, generatePrintableReport } from '../utils/printUtils.jsx';

export default function Reports() {
  const [selectedReport, setSelectedReport] = useState(null);
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });

  const { data: maintenanceCost, refetch: refetchMaintenanceCost } = useQuery({
    queryKey: ['reports', 'maintenance-cost', dateRange],
    queryFn: async () => {
      const params = dateRange.startDate && dateRange.endDate ? dateRange : {};
      const res = await api.get(`/reports/maintenance-cost`, { params });
      return res.data;
    },
    enabled: selectedReport === 'maintenance-cost'
  });

  const { data: assetStatus, refetch: refetchAssetStatus } = useQuery({
    queryKey: ['reports', 'asset-status'],
    queryFn: async () => {
      const res = await api.get('/reports/asset-status');
      return res.data;
    },
    enabled: selectedReport === 'asset-status'
  });

  const { data: workOrderSummary, refetch: refetchWorkOrderSummary } = useQuery({
    queryKey: ['reports', 'workorder-summary', dateRange],
    queryFn: async () => {
      const params = dateRange.startDate && dateRange.endDate ? dateRange : {};
      const res = await api.get('/reports/work-order-summary', { params });
      return res.data;
    },
    enabled: selectedReport === 'workorder-summary'
  });

  const handleGenerateReport = (reportType) => {
    setSelectedReport(reportType);
    if (reportType === 'maintenance-cost') {
      refetchMaintenanceCost();
    } else if (reportType === 'asset-status') {
      refetchAssetStatus();
    } else if (reportType === 'workorder-summary') {
      refetchWorkOrderSummary();
    }
  };

  const handlePrintReport = (reportType, data) => {
    const filters = dateRange.startDate && dateRange.endDate ? {
      'Date Range': `${dateRange.startDate} to ${dateRange.endDate}`
    } : {};
    
    const printComponent = generatePrintableReport(data, reportType, filters);
    printDocument(printComponent, `${reportType.replace('-', ' ')} Report`);
  };

  const ReportCard = ({ icon: Icon, title, description, reportType }) => (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer border-2 border-transparent hover:border-primary-500"
         onClick={() => handleGenerateReport(reportType)}>
      <div className="flex items-center gap-4 mb-4">
        <div className="p-3 bg-primary-100 rounded-lg">
          <Icon className="h-8 w-8 text-primary-600" />
        </div>
        <div>
          <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
          <p className="text-sm text-gray-600">{description}</p>
        </div>
      </div>
    </div>
  );

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Reports & Analytics</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <ReportCard
          icon={CurrencyDollarIcon}
          title="Maintenance Cost Report"
          description="View maintenance costs over time"
          reportType="maintenance-cost"
        />
        <ReportCard
          icon={ChartBarIcon}
          title="Asset Status Report"
          description="Overall asset status summary"
          reportType="asset-status"
        />
        <ReportCard
          icon={DocumentTextIcon}
          title="Work Order Summary"
          description="Work order statistics and trends"
          reportType="workorder-summary"
        />
      </div>

      {selectedReport === 'maintenance-cost' && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold">Maintenance Cost Report</h2>
            <div className="flex gap-3">
              <input
                type="date"
                placeholder="Start Date"
                className="border border-gray-300 rounded-lg px-3 py-2"
                value={dateRange.startDate}
                onChange={(e) => setDateRange({...dateRange, startDate: e.target.value})}
              />
              <input
                type="date"
                placeholder="End Date"
                className="border border-gray-300 rounded-lg px-3 py-2"
                value={dateRange.endDate}
                onChange={(e) => setDateRange({...dateRange, endDate: e.target.value})}
              />
              <button
                onClick={() => refetchMaintenanceCost()}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                Generate
              </button>
              {maintenanceCost && (
                <button
                  onClick={() => handlePrintReport('maintenance-cost', { maintenance: maintenanceCost })}
                  className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  <PrinterIcon className="h-4 w-4 mr-2" />
                  Print
                </button>
              )}
            </div>
          </div>
          {maintenanceCost && (
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Total Cost</p>
                  <p className="text-2xl font-bold text-blue-600">
                    ${maintenanceCost.summary?.totalCost?.toFixed(2) || '0.00'}
                  </p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Total Records</p>
                  <p className="text-2xl font-bold text-green-600">
                    {maintenanceCost.summary?.totalRecords || 0}
                  </p>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Total Hours</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {maintenanceCost.summary?.totalLaborHours?.toFixed(1) || '0.0'}
                  </p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Avg Cost/Record</p>
                  <p className="text-2xl font-bold text-purple-600">
                    ${maintenanceCost.summary?.averageCostPerRecord?.toFixed(2) || '0.00'}
                  </p>
                </div>
              </div>
              {maintenanceCost.costByAsset && maintenanceCost.costByAsset.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">Costs by Asset</h3>
                  <div className="space-y-2">
                    {maintenanceCost.costByAsset.slice(0, 10).map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <div>
                          <span className="font-medium">{item.asset?.name || 'Unknown Asset'}</span>
                          <span className="text-sm text-gray-500 ml-2">
                            ({item.count} record{item.count !== 1 ? 's' : ''})
                          </span>
                        </div>
                        <span className="font-semibold">${item.totalCost.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {selectedReport === 'asset-status' && assetStatus && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold">Asset Status Report</h2>
            <button
              onClick={() => handlePrintReport('assets', { assets: assetStatus.assets || [] })}
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <PrinterIcon className="h-4 w-4 mr-2" />
              Print Report
            </button>
          </div>
          <div className="text-center p-4 bg-blue-50 rounded-lg mb-6">
            <p className="text-sm text-gray-600">Total Assets</p>
            <p className="text-4xl font-bold text-blue-600">{assetStatus.summary?.totalAssets || 0}</p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            {assetStatus.summary?.statusBreakdown?.map((status) => {
              const colorMap = {
                operational: 'bg-green-50 text-green-600',
                maintenance: 'bg-yellow-50 text-yellow-600',
                repair: 'bg-red-50 text-red-600',
                retired: 'bg-gray-50 text-gray-600',
                lost: 'bg-purple-50 text-purple-600',
                inactive: 'bg-gray-50 text-gray-400'
              };
              const colors = colorMap[status._id] || 'bg-gray-50 text-gray-600';
              
              return (
                <div key={status._id} className={`text-center p-4 rounded-lg ${colors.split(' ')[0]}`}>
                  <p className={`text-3xl font-bold ${colors.split(' ')[1]}`}>{status.count}</p>
                  <p className="text-sm text-gray-600 mt-1 capitalize">{status._id}</p>
                </div>
              );
            })}
          </div>
          
          {assetStatus.summary?.categoryBreakdown && assetStatus.summary.categoryBreakdown.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-3">Assets by Category</h3>
              <div className="space-y-2">
                {assetStatus.summary.categoryBreakdown.map((category) => (
                  <div key={category._id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="capitalize">{category._id || 'Uncategorized'}</span>
                    <span className="font-semibold">{category.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {assetStatus.needingMaintenance && assetStatus.needingMaintenance.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-3">Upcoming Maintenance (Next 30 Days)</h3>
              <div className="space-y-2">
                {assetStatus.needingMaintenance.map((record, idx) => (
                  <div key={idx} className={`flex justify-between items-center p-3 rounded-lg ${
                    new Date(record.dueDate) < new Date() ? 'bg-red-50' : 'bg-yellow-50'
                  }`}>
                    <div className="flex-1">
                      <div className="font-medium">{record.asset?.name || 'Unknown Asset'}</div>
                      <div className="text-sm text-gray-600 mt-1">
                        {record.title} - {record.asset?.assetNumber ? `(${record.asset.assetNumber})` : ''}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-sm font-semibold ${new Date(record.dueDate) < new Date() ? 'text-red-600' : 'text-yellow-600'}`}>
                        {new Date(record.dueDate).toLocaleDateString()}
                      </div>
                      {record.dueDate && (
                        <div className="text-xs text-gray-500">
                          {new Date(record.dueDate) < new Date() ? 'Overdue' : 'Due'}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {selectedReport === 'workorder-summary' && workOrderSummary && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold">Work Order Summary</h2>
            <div className="flex gap-3">
              <input
                type="date"
                placeholder="Start Date"
                className="border border-gray-300 rounded-lg px-3 py-2"
                value={dateRange.startDate}
                onChange={(e) => setDateRange({...dateRange, startDate: e.target.value})}
              />
              <input
                type="date"
                placeholder="End Date"
                className="border border-gray-300 rounded-lg px-3 py-2"
                value={dateRange.endDate}
                onChange={(e) => setDateRange({...dateRange, endDate: e.target.value})}
              />
              <button
                onClick={() => refetchWorkOrderSummary()}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                Generate
              </button>
              <button
                onClick={() => handlePrintReport('workorders', { workOrders: workOrderSummary.workOrders || [] })}
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <PrinterIcon className="h-4 w-4 mr-2" />
                Print
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-3xl font-bold text-blue-600">{workOrderSummary.summary?.totalWorkOrders || 0}</p>
              <p className="text-sm text-gray-600 mt-1">Total</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-600">
                ${(workOrderSummary.summary?.totalEstimatedCost || 0).toFixed(2)}
              </p>
              <p className="text-sm text-gray-600 mt-1">Est. Cost</p>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <p className="text-2xl font-bold text-yellow-600">
                ${(workOrderSummary.summary?.totalActualCost || 0).toFixed(2)}
              </p>
              <p className="text-sm text-gray-600 mt-1">Actual Cost</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <p className="text-2xl font-bold text-purple-600">
                {workOrderSummary.summary?.totalWorkOrders ? 
                  (((workOrderSummary.summary?.totalActualCost || 0) / workOrderSummary.summary.totalWorkOrders)).toFixed(2) : 
                  '0.00'
                }
              </p>
              <p className="text-sm text-gray-600 mt-1">Avg Cost</p>
            </div>
          </div>
          
          {workOrderSummary.summary?.statusBreakdown && workOrderSummary.summary.statusBreakdown.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3">Status Breakdown</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {workOrderSummary.summary.statusBreakdown.map((status) => {
                  const colorMap = {
                    open: 'bg-blue-50 text-blue-600',
                    assigned: 'bg-yellow-50 text-yellow-600',
                    in_progress: 'bg-orange-50 text-orange-600',
                    completed: 'bg-green-50 text-green-600',
                    cancelled: 'bg-red-50 text-red-600',
                    on_hold: 'bg-gray-50 text-gray-600'
                  };
                  const colors = colorMap[status._id] || 'bg-gray-50 text-gray-600';
                  
                  return (
                    <div key={status._id} className={`text-center p-4 rounded-lg ${colors.split(' ')[0]}`}>
                      <p className={`text-3xl font-bold ${colors.split(' ')[1]}`}>{status.count}</p>
                      <p className="text-sm text-gray-600 mt-1 capitalize">{status._id.replace('_', ' ')}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
          {workOrderSummary.summary?.priorityBreakdown && workOrderSummary.summary.priorityBreakdown.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-3">Priority Breakdown</h3>
              <div className="space-y-2">
                {workOrderSummary.summary.priorityBreakdown.map((priority) => {
                  const colorMap = {
                    critical: 'text-red-600',
                    high: 'text-orange-600',
                    medium: 'text-yellow-600',
                    low: 'text-green-600'
                  };
                  const color = colorMap[priority._id] || 'text-gray-600';
                  
                  return (
                    <div key={priority._id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <span className={`capitalize font-semibold ${color}`}>{priority._id}</span>
                      <span className="font-semibold">{priority.count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
