import { Outlet, NavLink } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'
import { 
  HomeIcon, 
  CubeIcon, 
  WrenchScrewdriverIcon,
  ClipboardDocumentListIcon,
  ChartBarIcon,
  ArrowRightOnRectangleIcon,
  SignalIcon,
  UsersIcon,
  DocumentTextIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'

export default function Layout() {
  const { user, logout } = useAuth()

  // Fetch dashboard stats for quick status
  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const response = await api.get('/dashboard/stats')
      return response.data
    }
  })

  const navigation = [
    { name: 'Dashboard', href: '/', icon: HomeIcon },
    { name: 'Assets', href: '/assets', icon: CubeIcon },
    { name: 'Maintenance', href: '/maintenance', icon: WrenchScrewdriverIcon },
    { name: 'Work Orders', href: '/work-orders', icon: ClipboardDocumentListIcon },
    { name: 'Checklists', href: '/checklists', icon: CheckCircleIcon },
    { name: 'Quotes', href: '/quotes', icon: DocumentTextIcon },
    { name: 'Reports', href: '/reports', icon: ChartBarIcon },
    ...(user?.role === 'admin' ? [{ name: 'Users', href: '/users', icon: UsersIcon }] : []),
  ]

  return (
    <div className="min-h-screen bg-gray-200">
      {/* Header Bar */}
      <div className="fixed top-0 left-0 right-0 h-14 bg-white border-b border-gray-200 z-30">
        <div className="h-full flex items-center justify-between px-6">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 bg-gradient-to-br from-primary-600 to-primary-700 rounded-lg flex items-center justify-center shadow-md">
                <SignalIcon className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900 leading-tight">
                  <span className="text-primary-600">APSAR</span> <span className="font-normal text-gray-600">Tracker</span>
                </h1>
                <p className="text-xs text-gray-500 leading-none">Anaconda Pintler SAR</p>
              </div>
            </div>
            <nav className="hidden md:flex items-center gap-1">
              {navigation.map((item) => (
                <NavLink
                  key={item.name}
                  to={item.href}
                  end={item.href === '/'}
                  className={({ isActive }) =>
                    `px-4 py-2 text-sm font-medium rounded-md transition-all ${
                      isActive
                        ? 'bg-primary-50 text-primary-700'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`
                  }
                >
                  {item.name}
                </NavLink>
              ))}
            </nav>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 text-sm">
              <div className="text-right">
                <p className="font-medium text-gray-900">{user?.firstName} {user?.lastName}</p>
                <p className="text-xs text-gray-500 capitalize">{user?.role} • {user?.unit}</p>
              </div>
              <div className="h-8 w-8 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-sm">
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </div>
            </div>
                                      <button
               onClick={logout}
               className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-md transition-all"
               title="Logout"
             >
              <ArrowRightOnRectangleIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

                   {/* Sidebar for mobile */}
      <div className="hidden md:fixed md:inset-y-0 md:flex md:w-64 md:flex-col md:pt-14">
        <div className="flex flex-col flex-grow bg-gray-200 border-r border-gray-300 overflow-y-auto">
          
          <div className="mt-4 flex-1 flex flex-col px-3">
            <nav className="space-y-1">
              {navigation.map((item) => (
                <NavLink
                  key={item.name}
                  to={item.href}
                  end={item.href === '/'}
                                                        className={({ isActive }) =>
                     `${
                       isActive
                         ? 'bg-white text-primary-600 shadow-sm border-l-4 border-primary-600'
                         : 'text-gray-600 hover:bg-white hover:text-gray-900'
                     } group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all`
                   }
                >
                  {({ isActive }) => (
                    <>
                                                                  <item.icon
                         className={`${
                           isActive ? 'text-primary-600' : 'text-gray-400'
                         } mr-3 flex-shrink-0 h-5 w-5`}
                       />
                      {item.name}
                    </>
                  )}
                </NavLink>
              ))}
            </nav>
            
                                      {/* Quick Stats Section */}
             <div className="mt-6 p-3 bg-gradient-to-br from-primary-50 to-primary-100 rounded-xl border border-primary-200">
               <h3 className="text-xs font-semibold text-primary-900 uppercase tracking-wider mb-3">
                 Quick Status
               </h3>
               <div className="space-y-2">
                 <div className="flex items-center justify-between text-xs">
                   <span className="text-gray-600">Total Assets</span>
                   <span className="font-semibold text-primary-700">{stats?.assets?.total || 0}</span>
                 </div>
                 <div className="flex items-center justify-between text-xs">
                   <span className="text-gray-600">Operational</span>
                   <span className="font-semibold text-green-600">{stats?.assets?.operational || 0}</span>
                 </div>
                 <div className="flex items-center justify-between text-xs">
                   <span className="text-gray-600">In Maintenance</span>
                   <span className="font-semibold text-yellow-600">{stats?.assets?.maintenance || 0}</span>
                 </div>
                 <div className="flex items-center justify-between text-xs">
                   <span className="text-gray-600">Open Work Orders</span>
                   <span className="font-semibold text-orange-600">{stats?.workOrders?.open || 0}</span>
                 </div>
               </div>
             </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="md:pl-64 flex flex-col flex-1 pt-14">
        <main className="flex-1">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              <Outlet />
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
