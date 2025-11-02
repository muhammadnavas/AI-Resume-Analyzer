import { useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import './App.css';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import { ApiKeyProvider } from './context/ApiKeyContext';
import Dashboard from './pages/Dashboard';
import JobScraper from './pages/JobScraper';
import ResumeAnalyzer from './pages/ResumeAnalyzer';

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <ApiKeyProvider>
      <Router>
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100">
          <Toaster 
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#1f2937',
                color: '#fff',
                borderRadius: '12px',
                border: '1px solid #374151',
                fontSize: '14px',
                fontWeight: '500',
                padding: '16px',
              },
              success: {
                duration: 3000,
                style: {
                  background: 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
                },
              },
              error: {
                style: {
                  background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                },
              },
              loading: {
                style: {
                  background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                },
              },
            }}
          />
          
          <Header 
            sidebarOpen={sidebarOpen} 
            setSidebarOpen={setSidebarOpen} 
          />
          
          <div className="flex h-screen pt-16">
            <Sidebar 
              sidebarOpen={sidebarOpen} 
              setSidebarOpen={setSidebarOpen} 
            />
            
            <main className="flex-1 overflow-y-auto lg:ml-64">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route 
                  path="/analyzer" 
                  element={
                    <div className="p-6 lg:p-8">
                      <ResumeAnalyzer />
                    </div>
                  } 
                />
                <Route 
                  path="/scraper" 
                  element={
                    <div className="p-6 lg:p-8">
                      <JobScraper />
                    </div>
                  } 
                />
              </Routes>
            </main>
          </div>
        </div>
      </Router>
    </ApiKeyProvider>
  );
}

export default App;