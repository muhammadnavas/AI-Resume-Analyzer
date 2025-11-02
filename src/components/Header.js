import { Key, Menu, Settings, X } from 'lucide-react';
import { useApiKey } from '../context/ApiKeyContext';

const Header = ({ sidebarOpen, setSidebarOpen }) => {
  const { isApiKeyValid, clearApiKey } = useApiKey();

  return (
    <header className="fixed top-0 left-0 right-0 bg-white/90 backdrop-blur-md shadow-lg border-b border-gray-200/60 z-40">
      <div className="flex items-center justify-between h-16 px-4 lg:px-6">
        {/* Left side - Menu button and Logo */}
        <div className="flex items-center">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-xl text-gray-600 hover:text-gray-900 hover:bg-gray-100/80 lg:hidden transition-all duration-200 hover:scale-105"
          >
            {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          
          <div className="flex items-center ml-4 lg:ml-0">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 via-purple-500 to-indigo-600 rounded-xl flex items-center justify-center mr-3 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
              <span className="text-white font-bold text-lg">AI</span>
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
                AI Resume Analyzer
              </h1>
              <p className="text-xs text-gray-500 hidden sm:block font-medium">
                Career Optimization Platform
              </p>
            </div>
          </div>
        </div>

        {/* Right side - API Key status and settings */}
        <div className="flex items-center space-x-4">
          {/* API Key Status */}
          <div className="flex items-center space-x-2 bg-gray-50/80 rounded-lg px-3 py-2 border border-gray-200/60">
            <Key size={16} className={isApiKeyValid ? 'text-green-500' : 'text-red-500'} />
            <span className={`text-sm font-medium ${isApiKeyValid ? 'text-green-600' : 'text-red-600'}`}>
              {isApiKeyValid ? 'API Connected' : 'API Key Required'}
            </span>
          </div>

          {/* Settings Menu */}
          {isApiKeyValid && (
            <button
              onClick={clearApiKey}
              className="p-2 rounded-xl text-gray-600 hover:text-gray-900 hover:bg-gray-100/80 transition-all duration-200 hover:scale-105"
              title="Clear API Key"
            >
              <Settings size={20} />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;