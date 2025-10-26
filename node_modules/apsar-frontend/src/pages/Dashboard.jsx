import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query'
import api from '../services/api'
import Calendar from '../components/Calendar'
import {
  CubeIcon,
  WrenchScrewdriverIcon,
  ClipboardDocumentListIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'

export default function Dashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const response = await api.get('/dashboard/stats')
      return response.data
    }
  })

  // Transform calendar data for the Calendar component
  const calendarEvents = useMemo(() => {
    if (!stats?.calendar) return [];
    
    const events = [];
    
    // Add maintenance events
    stats.calendar.maintenance?.forEach(item => {
      if (item.dueDate) {
        events.push({
          date: new Date(item.dueDate),
          title: item.title || `${item.asset?.name || 'Asset'} - Maintenance`,
          color: 'bg-yellow-100 text-yellow-800 border-yellow-400'
        });
      }
    });
    
    // Add work order events
    stats.calendar.workOrders?.forEach(item => {
      if (item.scheduledStartDate) {
        events.push({
          date: new Date(item.scheduledStartDate),
          title: item.title || `${item.asset?.name || 'Asset'} - Work Order`,
          color: 'bg-primary-100 text-primary-800 border-primary-400'
        });
      }
    });
    
    console.log('Calendar events:', events);
    
    return events;
  }, [stats]);

  if (isLoading) {
    return <div>Loading...</div>
  }

  const statCards = [
    {
      name: 'Total Assets',
      value: stats?.assets?.total || 0,
      icon: CubeIcon,
      color: 'bg-blue-500'
    },
    {
      name: 'Operational',
      value: stats?.assets?.operational || 0,
      icon: CubeIcon,
      color: 'bg-green-500'
    },
    {
      name: 'Completed Maintenance',
      value: stats?.maintenance?.completed || 0,
      icon: WrenchScrewdriverIcon,
      color: 'bg-green-600'
    },
    {
      name: 'Completed Work Orders',
      value: stats?.workOrders?.completed || 0,
      icon: ClipboardDocumentListIcon,
      color: 'bg-green-600'
    }
  ]

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Dashboard</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {statCards.map((stat) => (
          <div key={stat.name} className="stat-card group cursor-pointer transition-all hover:scale-105">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">{stat.name}</p>
                <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
              </div>
              <div className={`${stat.color} flex-shrink-0 p-4 rounded-xl shadow-md group-hover:shadow-lg transition-all`}>
                <stat.icon className="h-8 w-8 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Alerts */}
      {stats?.maintenance?.overdue > 0 && (
        <div className="mb-8 bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                {stats.maintenance.overdue} Overdue Maintenance Item{stats.maintenance.overdue > 1 ? 's' : ''}
              </h3>
              <p className="mt-2 text-sm text-yellow-700">
                Action required: Please review overdue maintenance items
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Upcoming Maintenance by Date */}
      {stats?.maintenance?.upcoming?.length > 0 && (
        <div className="card mb-6">
          <h3 className="text-lg font-semibold mb-4">Upcoming Maintenance</h3>
          <div className="space-y-4">
            {(() => {
              // Group maintenance by date
              const groupedByDate = stats.maintenance.upcoming.reduce((acc, maintenance) => {
                const dateKey = new Date(maintenance.dueDate).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                });
                if (!acc[dateKey]) {
                  acc[dateKey] = [];
                }
                acc[dateKey].push(maintenance);
                return acc;
              }, {});

              // Sort dates
              const sortedDates = Object.keys(groupedByDate).sort((a, b) => {
                return new Date(a) - new Date(b);
              });

              return sortedDates.map((dateKey) => (
                <div key={dateKey} className="border-l-4 border-primary-500 pl-4">
                  <h4 className="text-sm font-bold text-gray-700 mb-2">{dateKey}</h4>
                  <ul className="space-y-2">
                    {groupedByDate[dateKey].map((maintenance) => (
                      <li key={maintenance._id} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            {maintenance.asset?.name || 'Unknown Asset'}
                          </p>
                          <p className="text-xs text-gray-600">{maintenance.title}</p>
                        </div>
                        <div className="ml-4">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            maintenance.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                            maintenance.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                            maintenance.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {maintenance.priority}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ));
            })()}
          </div>
        </div>
      )}

      {/* Calendar Section */}
      <div className="mb-8">
        <Calendar events={calendarEvents} />
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expiring Certifications */}
        {stats?.expiring?.length > 0 && (
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Expiring Certifications</h3>
            <ul className="space-y-3">
              {stats.expiring.slice(0, 5).map((item, idx) => (
                <li key={idx} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{item.name}</p>
                    <p className="text-xs text-gray-500">{item.assetNumber}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Check certifications</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Recent Activity */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
          {stats?.recentActivity?.length > 0 ? (
            <ul className="space-y-3">
              {stats.recentActivity.slice(0, 5).map((activity) => (
                <li key={activity._id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{activity.asset.name}</p>
                    <p className="text-xs text-gray-500">
                      {activity.performedBy?.firstName} {activity.performedBy?.lastName}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">
                      {new Date(activity.completedDate).toLocaleDateString()}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500">No recent activity</p>
          )}
        </div>
      </div>
    </div>
  )
}
