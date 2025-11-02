import {
    BarChart3,
    FileText,
    Home,
    Search,
    Target,
    TrendingUp,
    X
} from 'lucide-react';
import { NavLink } from 'react-router-dom';

const Sidebar = ({ sidebarOpen, setSidebarOpen }) => {
  const navigation = [
    { name: 'Dashboard', href: '/', icon: Home },
    { name: 'Resume Analyzer', href: '/analyzer', icon: FileText },
    { name: 'Job Scraper', href: '/scraper', icon: Search },
  ];

  const features = [
    { name: 'Smart Analysis', icon: BarChart3 },
    { name: 'Career Insights', icon: TrendingUp },
    { name: 'Job Matching', icon: Target },
  ];

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-gray-600 bg-opacity-75 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-30 w-64 bg-white/95 backdrop-blur-md shadow-2xl transform transition-transform duration-300 ease-in-out lg:translate-x-0 border-r border-gray-200/50
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full pt-16">
          {/* Close button for mobile */}
          <div className="flex items-center justify-between p-4 lg:hidden border-b border-gray-200/50">
            <h2 className="text-lg font-semibold text-gray-900">Navigation</h2>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-2 rounded-xl text-gray-600 hover:text-gray-900 hover:bg-gray-100/80 transition-all duration-200 hover:scale-105"
            >
              <X size={20} />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 pb-4">
            <div className="mb-6 mt-4">
              <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Main Navigation
              </h3>
              <div className="space-y-1">
                {navigation.map((item) => (
                  <NavLink
                    key={item.name}
                    to={item.href}
                    className={({ isActive }) =>
                      `group flex items-center px-3 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${
                        isActive
                          ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg transform scale-105'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/80 hover:scale-105'
                      }`
                    }
                    onClick={() => setSidebarOpen(false)}
                  >
                    <item.icon 
                      className={`mr-3 h-5 w-5 transition-all duration-200`}
                    />
                    {item.name}
                  </NavLink>
                ))}
              </div>
            </div>

            {/* Features section */}
            <div className="mb-6">
              <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Features
              </h3>
              <div className="space-y-1">
                {features.map((item) => (
                  <div
                    key={item.name}
                    className="group flex items-center px-3 py-2 text-sm font-medium text-gray-600 rounded-xl hover:bg-gray-100/80 transition-all duration-200 cursor-pointer"
                  >
                    <item.icon className="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-600 transition-colors duration-200" />
                    {item.name}
                  </div>
                ))}
              </div>
            </div>

          </nav>

          {/* Info card */}
          <div className="p-4 mt-auto">
            <div className="bg-gradient-to-br from-blue-500 via-purple-500 to-indigo-600 rounded-2xl p-4 text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
              <h4 className="text-sm font-semibold mb-2">
                AI Resume Analysis
              </h4>
              <p className="text-xs opacity-90 leading-relaxed">
                Advanced resume analysis with AI-powered insights for better career opportunities.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;