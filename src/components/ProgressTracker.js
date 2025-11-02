
/**
 * Advanced Progress Tracker Component
 * Shows detailed progress for file processing with memory usage and stats
 */
const ProgressTracker = ({ 
  progress = 0, 
  message = '', 
  fileName = '', 
  fileSize = 0, 
  estimatedTime = null,
  memoryUsage = null,
  stage = 'reading',
  onCancel = null,
  showMemoryUsage = false,
  showDetailedStats = false
}) => {
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatTime = (seconds) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const getStageColor = (currentStage) => {
    const colors = {
      reading: 'bg-blue-500',
      processing: 'bg-yellow-500',
      analyzing: 'bg-purple-500',
      completing: 'bg-green-500'
    };
    return colors[currentStage] || 'bg-gray-500';
  };

  const getProgressColor = () => {
    if (progress < 25) return 'from-red-500 to-red-600';
    if (progress < 50) return 'from-yellow-500 to-yellow-600';
    if (progress < 75) return 'from-blue-500 to-blue-600';
    return 'from-green-500 to-green-600';
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-md mx-auto border">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${getStageColor(stage)} animate-pulse`}></div>
          <h3 className="text-lg font-semibold text-gray-800">Processing Document</h3>
        </div>
        {onCancel && (
          <button
            onClick={onCancel}
            className="text-red-500 hover:text-red-700 text-sm font-medium"
          >
            Cancel
          </button>
        )}
      </div>

      {/* File Info */}
      {fileName && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-2 mb-1">
            <span className="text-2xl">📄</span>
            <span className="font-medium text-gray-800 truncate">{fileName}</span>
          </div>
          {fileSize > 0 && (
            <p className="text-sm text-gray-600">Size: {formatFileSize(fileSize)}</p>
          )}
        </div>
      )}

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">Progress</span>
          <span className="text-sm font-bold text-gray-900">{Math.round(progress)}%</span>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div
            className={`h-full bg-gradient-to-r ${getProgressColor()} transition-all duration-300 ease-out rounded-full`}
            style={{ width: `${Math.max(progress, 5)}%` }}
          >
            <div className="h-full bg-white bg-opacity-30 animate-pulse"></div>
          </div>
        </div>
      </div>

      {/* Current Status Message */}
      {message && (
        <div className={`mb-4 p-3 rounded-lg border-l-4 ${
          message.includes('fallback mode') 
            ? 'bg-orange-50 border-orange-500' 
            : 'bg-blue-50 border-blue-500'
        }`}>
          <p className={`text-sm font-medium ${
            message.includes('fallback mode') 
              ? 'text-orange-800' 
              : 'text-blue-800'
          }`}>
            {message}
          </p>
          {message.includes('fallback mode') && (
            <div className="mt-2 p-2 bg-orange-100 rounded border border-orange-200">
              <p className="text-xs text-orange-700">
                <strong>⚠️ Processing Mode:</strong> Using main thread processing. 
                Browser may show "Page Unresponsive" - click "Wait" to continue.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Estimated Time */}
      {estimatedTime && (
        <div className="mb-4 flex items-center justify-between text-sm text-gray-600">
          <span>Estimated time remaining:</span>
          <span className="font-medium">{formatTime(estimatedTime)}</span>
        </div>
      )}

      {/* Memory Usage (Optional) */}
      {showMemoryUsage && memoryUsage && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Memory Usage</h4>
          <div className="space-y-1 text-xs text-gray-600">
            <div className="flex justify-between">
              <span>Used:</span>
              <span>{memoryUsage.used} MB</span>
            </div>
            <div className="flex justify-between">
              <span>Total:</span>
              <span>{memoryUsage.total} MB</span>
            </div>
            <div className="flex justify-between">
              <span>Limit:</span>
              <span>{memoryUsage.limit} MB</span>
            </div>
          </div>
          
          {/* Memory Usage Bar */}
          <div className="mt-2">
            <div className="w-full bg-gray-200 rounded-full h-1">
              <div
                className="h-full bg-yellow-500 rounded-full"
                style={{ width: `${Math.min((memoryUsage.used / memoryUsage.limit) * 100, 100)}%` }}
              ></div>
            </div>
          </div>
        </div>
      )}

      {/* Processing Stages */}
      <div className="space-y-2">
        <div className="text-xs text-gray-500 font-medium">Processing Stages</div>
        <div className="flex items-center space-x-2">
          {['Reading', 'Processing', 'Analyzing', 'Complete'].map((stageName, index) => {
            const isActive = stage === stageName.toLowerCase();
            const isCompleted = ['reading', 'processing', 'analyzing', 'completing'].indexOf(stage) > index;
            
            return (
              <div key={stageName} className="flex items-center">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    isActive
                      ? 'bg-blue-500 text-white animate-pulse'
                      : isCompleted
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-300 text-gray-600'
                  }`}
                >
                  {isCompleted ? '✓' : index + 1}
                </div>
                {index < 3 && (
                  <div
                    className={`w-8 h-0.5 ${
                      isCompleted ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                  ></div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Detailed Stats (Optional) */}
      {showDetailedStats && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-2 gap-4 text-xs text-gray-600">
            <div>
              <div className="font-medium">Stage</div>
              <div className="capitalize">{stage}</div>
            </div>
            <div>
              <div className="font-medium">Progress</div>
              <div>{Math.round(progress)}%</div>
            </div>
          </div>
        </div>
      )}

      {/* Tips */}
      <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
        <div className="flex items-start space-x-2">
          <span className="text-yellow-600 text-sm">💡</span>
          <div className="text-xs text-yellow-800">
            <strong>Tip:</strong> Large files are processed in chunks to prevent browser freezing.
            {message && message.includes('fallback mode') && (
              <div className="mt-1 text-orange-700">
                <strong>Note:</strong> If browser shows "Page Unresponsive" dialog, click "Wait" - processing is working normally.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Simple Progress Bar Component (for inline use)
 */
export const SimpleProgressBar = ({ progress = 0, message = '', className = '' }) => {
  return (
    <div className={`w-full ${className}`}>
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm text-gray-600">{message}</span>
        <span className="text-sm font-medium text-gray-900">{Math.round(progress)}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-blue-500 h-2 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${Math.max(progress, 2)}%` }}
        ></div>
      </div>
    </div>
  );
};

/**
 * Multi-File Progress Tracker
 */
export const MultiFileProgressTracker = ({ 
  files = [], 
  currentFileIndex = 0, 
  overallProgress = 0,
  currentFileProgress = 0,
  currentFileName = '',
  onCancel = null 
}) => {
  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-lg mx-auto border">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Processing Multiple Files</h3>
        {onCancel && (
          <button
            onClick={onCancel}
            className="text-red-500 hover:text-red-700 text-sm font-medium"
          >
            Cancel All
          </button>
        )}
      </div>

      {/* Overall Progress */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">
            Overall Progress ({currentFileIndex + 1} of {files.length})
          </span>
          <span className="text-sm font-bold text-gray-900">{Math.round(overallProgress)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-300"
            style={{ width: `${Math.max(overallProgress, 2)}%` }}
          ></div>
        </div>
      </div>

      {/* Current File Progress */}
      <div className="mb-4">
        <div className="text-sm font-medium text-gray-700 mb-2">Current File:</div>
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="font-medium text-gray-800 truncate mb-2">{currentFileName}</div>
          <SimpleProgressBar 
            progress={currentFileProgress} 
            message="Processing..."
          />
        </div>
      </div>

      {/* File List */}
      <div className="space-y-2 max-h-32 overflow-y-auto">
        {files.map((file, index) => (
          <div
            key={index}
            className={`flex items-center space-x-3 p-2 rounded-lg ${
              index === currentFileIndex
                ? 'bg-blue-50 border border-blue-200'
                : index < currentFileIndex
                ? 'bg-green-50 border border-green-200'
                : 'bg-gray-50 border border-gray-200'
            }`}
          >
            <div className={`w-4 h-4 rounded-full flex items-center justify-center text-xs ${
              index < currentFileIndex
                ? 'bg-green-500 text-white'
                : index === currentFileIndex
                ? 'bg-blue-500 text-white'
                : 'bg-gray-300 text-gray-600'
            }`}>
              {index < currentFileIndex ? '✓' : index + 1}
            </div>
            <div className="flex-1 truncate text-sm text-gray-700">{file.name}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProgressTracker;