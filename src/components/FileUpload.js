import { AlertCircle, Upload, X } from 'lucide-react';
import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import toast from 'react-hot-toast';
import { DocumentProcessor } from '../services/documentProcessor';

const FileUpload = ({ onFileSelect, isProcessing = false }) => {
  const [uploadedFile, setUploadedFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);

  const supportedTypes = DocumentProcessor.getSupportedTypes();

  const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
    setDragActive(false);
    
    if (rejectedFiles.length > 0) {
      const rejectedFile = rejectedFiles[0];
      if (rejectedFile.errors.some(error => error.code === 'file-too-large')) {
        toast.error(`File size must be less than ${supportedTypes.maxSizeText}`);
      } else {
        toast.error('Please upload a valid PDF or Word document');
      }
      return;
    }

    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      
      // Additional validation using our DocumentProcessor
      const validation = DocumentProcessor.validateFile(file);
      if (!validation.isValid) {
        toast.error(validation.errors.join(', '));
        return;
      }

      setUploadedFile(file);
      onFileSelect(file);
      
      const fileType = validation.fileType.toUpperCase();
      toast.success(`${fileType} file uploaded successfully!`);
    }
  }, [onFileSelect, supportedTypes.maxSizeText]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: supportedTypes.accept,
    maxFiles: 1,
    maxSize: supportedTypes.maxSize,
    onDragEnter: () => setDragActive(true),
    onDragLeave: () => setDragActive(false),
    disabled: isProcessing
  });

  const removeFile = () => {
    setUploadedFile(null);
    onFileSelect(null);
    toast.success('File removed');
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (uploadedFile) {
    const fileType = DocumentProcessor.getFileType(uploadedFile);
    const fileIcon = DocumentProcessor.getFileIcon(fileType);
    const colorClass = DocumentProcessor.getFileTypeColor(fileType);
    
    return (
      <div className="w-full">
        <div className="border-2 border-green-300 bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className={`w-12 h-12 bg-gradient-to-br ${colorClass} rounded-2xl flex items-center justify-center shadow-lg`}>
                <span className="text-xl">{fileIcon}</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">{uploadedFile.name}</p>
                <p className="text-xs text-gray-600 font-medium">
                  {formatFileSize(uploadedFile.size)} • {fileType.toUpperCase()}
                </p>
              </div>
            </div>
            
            {!isProcessing && (
              <button
                onClick={removeFile}
                className="p-2 rounded-xl hover:bg-red-100 transition-all duration-200 transform hover:scale-105"
                title="Remove file"
              >
                <X className="w-5 h-5 text-red-500" />
              </button>
            )}
          </div>
          
          {isProcessing && (
            <div className="mt-6">
              <div className="flex items-center space-x-3 text-blue-700 mb-3">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent"></div>
                <span className="text-sm font-medium">Processing your resume...</span>
              </div>
              <div className="bg-blue-200 rounded-full h-3 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-500 to-purple-600 h-full rounded-full animate-pulse shadow-inner" style={{ width: '60%' }}></div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-300 transform hover:scale-105
          ${isDragActive || dragActive 
            ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-purple-50 shadow-xl' 
            : 'border-gray-300 hover:border-blue-400 hover:bg-gradient-to-br hover:from-gray-50 hover:to-blue-50 shadow-lg hover:shadow-xl'
          }
          ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input {...getInputProps()} />
        
        <div className="space-y-6">
          <div className={`mx-auto w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300 ${
            isDragActive ? 'bg-gradient-to-br from-blue-500 to-purple-600 scale-110' : 'bg-gradient-to-br from-gray-100 to-gray-200'
          }`}>
            <Upload className={`w-8 h-8 ${isDragActive ? 'text-white' : 'text-gray-400'}`} />
          </div>
          
          <div>
            <p className="text-xl font-semibold text-gray-900 mb-2">
              {isDragActive ? 'Drop your resume here' : 'Upload your resume'}
            </p>
            <p className="text-sm text-gray-600 font-medium">
              Drag and drop your PDF or Word document here, or click to browse
            </p>
          </div>
          
          <div className="text-xs text-gray-500 space-y-1">
            <p className="font-medium">Supported formats: PDF, DOCX, DOC</p>
            <p>Maximum file size: {supportedTypes.maxSizeText}</p>
          </div>
        </div>
      </div>
      
      {/* Help text */}
      <div className="mt-6 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-200/50 shadow-lg">
        <div className="flex items-start space-x-3">
          <div className="w-6 h-6 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
            <AlertCircle className="w-4 h-4 text-white" />
          </div>
          <div className="text-sm text-blue-700">
            <p className="font-semibold mb-2">Tips for best results:</p>
            <ul className="space-y-1 list-disc list-inside text-xs leading-relaxed">
              <li>Use a clear, well-formatted PDF or Word document</li>
              <li>Ensure text is selectable (not scanned images)</li>
              <li>Include all relevant sections: skills, experience, education</li>
              <li>For Word docs, use standard formatting for best text extraction</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FileUpload;