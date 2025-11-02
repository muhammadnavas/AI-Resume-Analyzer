import { createContext, useContext, useEffect, useState } from 'react';

const ApiKeyContext = createContext();

export const useApiKey = () => {
  const context = useContext(ApiKeyContext);
  if (!context) {
    throw new Error('useApiKey must be used within an ApiKeyProvider');
  }
  return context;
};

export const ApiKeyProvider = ({ children }) => {
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [isFromEnv, setIsFromEnv] = useState(false);

  useEffect(() => {
    // Check for environment variable first (highest priority)
    const envKey = process.env.REACT_APP_GEMINI_API_KEY;
    
    if (envKey && envKey.trim() && envKey !== 'your_gemini_api_key_here') {
      setGeminiApiKey(envKey.trim());
      setIsFromEnv(true);
      console.log('✅ Gemini API key loaded from environment variables');
      return;
    }

    // Fall back to localStorage if enabled and no environment variable
    const enableLocalStorageFallback = process.env.REACT_APP_ENABLE_LOCAL_STORAGE_FALLBACK === 'true';
    
    if (enableLocalStorageFallback) {
      const savedKey = localStorage.getItem('gemini_api_key');
      if (savedKey && savedKey.trim()) {
        setGeminiApiKey(savedKey.trim());
        setIsFromEnv(false);
        console.log('ℹ️ Gemini API key loaded from localStorage (fallback)');
        return;
      }
    }

    console.log('⚠️ No Gemini API key found in environment variables or localStorage');
  }, []);

  const updateGeminiApiKey = (key) => {
    // Don't allow overriding environment variable through UI
    if (isFromEnv) {
      console.warn('⚠️ Cannot override API key that was loaded from environment variables');
      return;
    }

    const enableLocalStorageFallback = process.env.REACT_APP_ENABLE_LOCAL_STORAGE_FALLBACK === 'true';
    
    if (!enableLocalStorageFallback) {
      console.warn('⚠️ Local storage fallback is disabled. Please set API key in environment variables.');
      return;
    }

    setGeminiApiKey(key);
    if (key && key.trim()) {
      localStorage.setItem('gemini_api_key', key.trim());
      console.log('✅ API key saved to localStorage');
    } else {
      localStorage.removeItem('gemini_api_key');
      console.log('🗑️ API key removed from localStorage');
    }
  };

  const clearApiKey = () => {
    if (isFromEnv) {
      console.warn('⚠️ Cannot clear API key that was loaded from environment variables');
      return;
    }
    
    setGeminiApiKey('');
    localStorage.removeItem('gemini_api_key');
    console.log('🗑️ API key cleared');
  };

  const value = {
    geminiApiKey,
    updateGeminiApiKey,
    clearApiKey,
    hasGeminiKey: !!geminiApiKey,
    isFromEnv,
    canModifyKey: !isFromEnv && process.env.REACT_APP_ENABLE_LOCAL_STORAGE_FALLBACK === 'true'
  };

  return (
    <ApiKeyContext.Provider value={value}>
      {children}
    </ApiKeyContext.Provider>
  );
};