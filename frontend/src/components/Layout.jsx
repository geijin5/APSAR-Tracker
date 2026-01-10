import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
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
  CheckCircleIcon,
  CalendarIcon,
  ChatBubbleLeftRightIcon,
  AcademicCapIcon,
  ChevronDownIcon,
  FolderOpenIcon,
  Bars3Icon,
  XMarkIcon
} from '@heroicons/react/24/outline'

export default function Layout() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const [maintenanceDropdownOpen, setMaintenanceDropdownOpen] = useState(false)
  const [maintenanceDropdownOpenSidebar, setMaintenanceDropdownOpenSidebar] = useState(false)
  const [maintenanceDropdownOpenMobile, setMaintenanceDropdownOpenMobile] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const maintenanceDropdownRef = useRef(null)
  const maintenanceDropdownRefSidebar = useRef(null)
  const maintenanceDropdownRefMobile = useRef(null)

  // Fetch dashboard stats for quick status
  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const response = await api.get('/dashboard/stats')
      return response.data
    }
  })

  // Fetch unread chat messages
  const { data: unreadData } = useQuery({
    queryKey: ['chat-unread'],
    queryFn: async () => {
      const response = await api.get('/chat/unread')
      return response.data
    },
    refetchInterval: 30000 // Poll every 30 seconds
  })

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (maintenanceDropdownRef.current && !maintenanceDropdownRef.current.contains(event.target)) {
        setMaintenanceDropdownOpen(false)
      }
      if (maintenanceDropdownRefSidebar.current && !maintenanceDropdownRefSidebar.current.contains(event.target)) {
        setMaintenanceDropdownOpenSidebar(false)
      }
      if (maintenanceDropdownRefMobile.current && !maintenanceDropdownRefMobile.current.contains(event.target)) {
        setMaintenanceDropdownOpenMobile(false)
      }
    }

    if (maintenanceDropdownOpen || maintenanceDropdownOpenSidebar || maintenanceDropdownOpenMobile) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [maintenanceDropdownOpen, maintenanceDropdownOpenSidebar, maintenanceDropdownOpenMobile])

  // Close dropdowns and mobile menu when route changes
  useEffect(() => {
    setMaintenanceDropdownOpen(false)
    setMaintenanceDropdownOpenSidebar(false)
    setMaintenanceDropdownOpenMobile(false)
    setMobileMenuOpen(false)
  }, [location.pathname])

  // Maintenance submenu items
  const maintenanceItems = [
    { name: 'Maintenance', href: '/maintenance', icon: WrenchScrewdriverIcon },
    { name: 'Work Orders', href: '/work-orders', icon: ClipboardDocumentListIcon },
    { name: 'Appointments', href: '/appointments', icon: CalendarIcon },
    { name: 'Quotes', href: '/quotes', icon: DocumentTextIcon },
  ]

  // Check if current route is a maintenance route
  const isMaintenanceRoute = maintenanceItems.some(item => location.pathname === item.href || location.pathname.startsWith(item.href + '/'))

  const navigation = [
    { name: 'Dashboard', href: '/', icon: HomeIcon },
    { name: 'Assets', href: '/assets', icon: CubeIcon },
    // Maintenance will be rendered as dropdown
    // Other items
    { name: 'Checklists', href: '/checklists', icon: CheckCircleIcon },
    { name: 'Certificates', href: '/certificates', icon: AcademicCapIcon },
    { name: 'Chat', href: '/chat', icon: ChatBubbleLeftRightIcon, badge: unreadData?.unreadCount },
    { name: 'Callouts', href: '/callouts', icon: ClipboardDocumentListIcon },
    { name: 'Callout Reports', href: '/callout-reports', icon: DocumentTextIcon },
    { name: 'Resources', href: '/resources', icon: FolderOpenIcon },
    { name: 'Reports', href: '/reports', icon: ChartBarIcon },
    ...(user?.role === 'admin' ? [{ name: 'Users', href: '/users', icon: UsersIcon }] : []),
  ]

  return (
    <div className="min-h-screen bg-gray-200 dark:bg-gray-900">
      {/* Header Bar */}
      <div className="fixed top-0 left-0 right-0 h-14 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 z-30">
        <div className="h-full flex items-center justify-between px-3 sm:px-4 md:px-6">
          <div className="flex items-center gap-2 sm:gap-4 md:gap-6 min-w-0 flex-1">
            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 -ml-1 rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <XMarkIcon className="h-6 w-6" />
              ) : (
                <Bars3Icon className="h-6 w-6" />
              )}
            </button>
            
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <img 
                src="/logo.png" 
                alt="APSAR Logo" 
                className="h-7 w-7 sm:h-8 sm:w-8 object-contain flex-shrink-0"
              />
              <div className="min-w-0">
                <h1 className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100 leading-tight truncate">
                  <span className="text-primary-600 dark:text-primary-400">APSAR</span> <span className="font-normal text-gray-600 dark:text-gray-400 hidden sm:inline">Tracker</span>
                </h1>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-none hidden sm:block">Anaconda Pintler SAR</p>
              </div>
            </div>
            <nav className="hidden md:flex items-center gap-1">
              {navigation.map((item) => (
                <NavLink
                  key={item.name}
                  to={item.href}
                  end={item.href === '/'}
                  className={({ isActive }) =>
                    `px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${
                      isActive
                        ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100'
                    }`
                  }
                >
                  {item.name}
                  {item.badge && item.badge > 0 && (
                    <span className="bg-primary-600 text-white text-xs font-semibold rounded-full h-5 w-5 flex items-center justify-center">
                      {item.badge > 9 ? '9+' : item.badge}
                    </span>
                  )}
                </NavLink>
              ))}
              
              {/* Maintenance Dropdown */}
              <div className="relative" ref={maintenanceDropdownRef}>
                <button
                  onClick={() => setMaintenanceDropdownOpen(!maintenanceDropdownOpen)}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${
                    isMaintenanceRoute
                      ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100'
                  }`}
                >
                  Maintenance
                  <ChevronDownIcon className={`h-4 w-4 transition-transform ${maintenanceDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {maintenanceDropdownOpen && (
                  <div className="absolute top-full left-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50 py-1">
                    {maintenanceItems.map((item) => {
                      const isActive = location.pathname === item.href || location.pathname.startsWith(item.href + '/')
                      return (
                        <NavLink
                          key={item.name}
                          to={item.href}
                          className={`flex items-center gap-2 px-4 py-2 text-sm ${
                            isActive
                              ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 font-medium'
                              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                          }`}
                          onClick={() => setMaintenanceDropdownOpen(false)}
                        >
                          <item.icon className="h-4 w-4" />
                          {item.name}
                        </NavLink>
                      )
                    })}
                  </div>
                )}
              </div>
            </nav>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-3 md:gap-4 flex-shrink-0">
            {/* User info - hidden on very small screens, shown on sm+ */}
            <div className="hidden sm:flex items-center gap-2 md:gap-3 text-sm">
              <div className="text-right hidden lg:block">
                <p className="font-medium text-gray-900 dark:text-gray-100">{user?.firstName} {user?.lastName}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{user?.role}{user?.unit ? ` • ${user.unit}` : ''}</p>
              </div>
              <div className="h-8 w-8 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-sm">
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </div>
            </div>
            {/* Avatar only on very small screens */}
            <div className="sm:hidden h-8 w-8 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center text-white font-semibold text-xs shadow-sm">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            <button
              onClick={logout}
              className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-all touch-manipulation"
              title="Logout"
              aria-label="Logout"
            >
              <ArrowRightOnRectangleIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <>
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 z-50 transform transition-transform md:hidden overflow-y-auto pt-14">
            <div className="flex flex-col h-full">
              <nav className="flex-1 px-3 py-4 space-y-1">
                {navigation.map((item) => (
                  <NavLink
                    key={item.name}
                    to={item.href}
                    end={item.href === '/'}
                    className={({ isActive }) =>
                      `${
                        isActive
                          ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 shadow-sm border-l-4 border-primary-600 dark:border-primary-500'
                          : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100'
                      } group flex items-center px-3 py-3 text-base font-medium rounded-lg transition-all touch-manipulation`
                    }
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {({ isActive }) => (
                      <>
                        <item.icon
                          className={`${
                            isActive ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400 dark:text-gray-500'
                          } mr-3 flex-shrink-0 h-6 w-6`}
                        />
                        <span className="flex-1">{item.name}</span>
                        {item.badge && item.badge > 0 && (
                          <span className="bg-primary-600 text-white text-xs font-semibold rounded-full h-6 w-6 flex items-center justify-center ml-2">
                            {item.badge > 9 ? '9+' : item.badge}
                          </span>
                        )}
                      </>
                    )}
                  </NavLink>
                ))}
                
                {/* Maintenance Dropdown Mobile */}
                <div className="relative" ref={maintenanceDropdownRefMobile}>
                  <button
                    onClick={() => setMaintenanceDropdownOpenMobile(!maintenanceDropdownOpenMobile)}
                    className={`w-full group flex items-center px-3 py-3 text-base font-medium rounded-lg transition-all touch-manipulation ${
                      isMaintenanceRoute
                        ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 shadow-sm border-l-4 border-primary-600 dark:border-primary-500'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100'
                    }`}
                  >
                    <WrenchScrewdriverIcon
                      className={`${
                        isMaintenanceRoute ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400 dark:text-gray-500'
                      } mr-3 flex-shrink-0 h-6 w-6`}
                    />
                    <span className="flex-1 text-left">Maintenance</span>
                    <ChevronDownIcon className={`h-5 w-5 transition-transform ${maintenanceDropdownOpenMobile ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {maintenanceDropdownOpenMobile && (
                    <div className="ml-3 mt-1 space-y-1">
                      {maintenanceItems.map((item) => {
                        const isActive = location.pathname === item.href || location.pathname.startsWith(item.href + '/')
                        return (
                          <NavLink
                            key={item.name}
                            to={item.href}
                            className={`flex items-center px-3 py-3 text-base font-medium rounded-lg transition-all touch-manipulation ${
                              isActive
                                ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 shadow-sm border-l-4 border-primary-600 dark:border-primary-500'
                                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100'
                            }`}
                            onClick={() => {
                              setMaintenanceDropdownOpenMobile(false)
                              setMobileMenuOpen(false)
                            }}
                          >
                            <item.icon
                              className={`${
                                isActive ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400 dark:text-gray-500'
                              } mr-3 flex-shrink-0 h-6 w-6`}
                            />
                            <span className="flex-1">{item.name}</span>
                          </NavLink>
                        )
                      })}
                    </div>
                  )}
                </div>
              </nav>
              
              {/* Quick Stats Section Mobile */}
              <div className="px-3 pb-4">
                <div className="p-3 bg-gradient-to-br from-primary-50 dark:from-primary-900/20 to-primary-100 dark:to-primary-800/20 rounded-xl border border-primary-200 dark:border-primary-800">
                  <h3 className="text-xs font-semibold text-primary-900 dark:text-primary-200 uppercase tracking-wider mb-3">
                    Quick Status
                  </h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Total Assets</span>
                      <span className="font-semibold text-primary-700 dark:text-primary-300">{stats?.assets?.total || 0}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Operational</span>
                      <span className="font-semibold text-green-600 dark:text-green-400">{stats?.assets?.operational || 0}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">In Maintenance</span>
                      <span className="font-semibold text-yellow-600 dark:text-yellow-400">{stats?.assets?.maintenance || 0}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Open Work Orders</span>
                      <span className="font-semibold text-orange-600 dark:text-orange-400">{stats?.workOrders?.open || 0}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

                   {/* Sidebar for mobile */}
      <div className="hidden md:fixed md:inset-y-0 md:flex md:w-64 md:flex-col md:pt-14">
        <div className="flex flex-col flex-grow bg-gray-200 dark:bg-gray-900 border-r border-gray-300 dark:border-gray-700 overflow-y-auto">
          
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
                        ? 'bg-white dark:bg-gray-800 text-primary-600 dark:text-primary-400 shadow-sm border-l-4 border-primary-600 dark:border-primary-500'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100'
                    } group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <item.icon
                        className={`${
                          isActive ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400 dark:text-gray-500'
                        } mr-3 flex-shrink-0 h-5 w-5`}
                      />
                      <span className="flex-1">{item.name}</span>
                      {item.badge && item.badge > 0 && (
                        <span className="bg-primary-600 text-white text-xs font-semibold rounded-full h-5 w-5 flex items-center justify-center">
                          {item.badge > 9 ? '9+' : item.badge}
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              ))}
              
              {/* Maintenance Dropdown */}
              <div className="relative" ref={maintenanceDropdownRefSidebar}>
                <button
                  onClick={() => setMaintenanceDropdownOpenSidebar(!maintenanceDropdownOpenSidebar)}
                  className={`w-full group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all ${
                    isMaintenanceRoute
                      ? 'bg-white dark:bg-gray-800 text-primary-600 dark:text-primary-400 shadow-sm border-l-4 border-primary-600 dark:border-primary-500'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100'
                  }`}
                >
                  <WrenchScrewdriverIcon
                    className={`${
                      isMaintenanceRoute ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400 dark:text-gray-500'
                    } mr-3 flex-shrink-0 h-5 w-5`}
                  />
                  <span className="flex-1 text-left">Maintenance</span>
                  <ChevronDownIcon className={`h-4 w-4 transition-transform ${maintenanceDropdownOpenSidebar ? 'rotate-180' : ''}`} />
                </button>
                
                {maintenanceDropdownOpenSidebar && (
                  <div className="ml-3 mt-1 space-y-1">
                    {maintenanceItems.map((item) => {
                      const isActive = location.pathname === item.href || location.pathname.startsWith(item.href + '/')
                      return (
                        <NavLink
                          key={item.name}
                          to={item.href}
                          className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all ${
                            isActive
                              ? 'bg-white dark:bg-gray-800 text-primary-600 dark:text-primary-400 shadow-sm border-l-4 border-primary-600 dark:border-primary-500'
                              : 'text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100'
                          }`}
                          onClick={() => setMaintenanceDropdownOpenSidebar(false)}
                        >
                          <item.icon
                            className={`${
                              isActive ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400 dark:text-gray-500'
                            } mr-3 flex-shrink-0 h-5 w-5`}
                          />
                          <span className="flex-1">{item.name}</span>
                        </NavLink>
                      )
                    })}
                  </div>
                )}
              </div>
            </nav>
            
                                      {/* Quick Stats Section */}
             <div className="mt-6 p-3 bg-gradient-to-br from-primary-50 dark:from-primary-900/20 to-primary-100 dark:to-primary-800/20 rounded-xl border border-primary-200 dark:border-primary-800">
               <h3 className="text-xs font-semibold text-primary-900 dark:text-primary-200 uppercase tracking-wider mb-3">
                 Quick Status
               </h3>
               <div className="space-y-2">
                 <div className="flex items-center justify-between text-xs">
                   <span className="text-gray-600 dark:text-gray-400">Total Assets</span>
                   <span className="font-semibold text-primary-700 dark:text-primary-300">{stats?.assets?.total || 0}</span>
                 </div>
                 <div className="flex items-center justify-between text-xs">
                   <span className="text-gray-600 dark:text-gray-400">Operational</span>
                   <span className="font-semibold text-green-600 dark:text-green-400">{stats?.assets?.operational || 0}</span>
                 </div>
                 <div className="flex items-center justify-between text-xs">
                   <span className="text-gray-600 dark:text-gray-400">In Maintenance</span>
                   <span className="font-semibold text-yellow-600 dark:text-yellow-400">{stats?.assets?.maintenance || 0}</span>
                 </div>
                 <div className="flex items-center justify-between text-xs">
                   <span className="text-gray-600 dark:text-gray-400">Open Work Orders</span>
                   <span className="font-semibold text-orange-600 dark:text-orange-400">{stats?.workOrders?.open || 0}</span>
                 </div>
               </div>
             </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="md:pl-64 flex flex-col flex-1 pt-14">
        <main className="flex-1 min-w-0">
          <div className="py-4 sm:py-6">
            <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
              <Outlet />
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
