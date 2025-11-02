/**
 * Backend Document Processing Service
 * Handles communication with the Express.js backend for document processing
 */

class BackendDocumentProcessor {
  constructor(backendUrl = 'http://localhost:5000') {
    this.backendUrl = backendUrl;
  }

  /**
   * Check if backend is available
   */
  async checkBackendHealth() {
    try {
      const response = await fetch(`${this.backendUrl}/api/health`);
      if (!response.ok) {
        throw new Error(`Backend health check failed: ${response.status}`);
      }
      const data = await response.json();
      return { available: true, data };
    } catch (error) {
      console.warn('Backend not available:', error.message);
      return { available: false, error: error.message };
    }
  }

  /**
   * Process document using backend API
   */
  async processDocument(file, options = {}) {
    try {
      // Check if file exists and is valid
      if (!file) {
        throw new Error('No file provided');
      }

      // Validate file type
      const validTypes = ['.pdf', '.docx', '.doc'];
      const fileName = file.name.toLowerCase();
      const isValidType = validTypes.some(type => fileName.endsWith(type));
      
      if (!isValidType) {
        throw new Error('Invalid file type. Please upload PDF or DOCX files only.');
      }

      // Check file size (50MB limit)
      const maxSize = 50 * 1024 * 1024; // 50MB
      if (file.size > maxSize) {
        throw new Error('File size exceeds 50MB limit');
      }

      // Create FormData for file upload
      const formData = new FormData();
      formData.append('document', file);
      
      // Add processing options
      if (options.chunkSize) {
        formData.append('chunkSize', options.chunkSize.toString());
      }
      if (options.overlap) {
        formData.append('overlap', options.overlap.toString());
      }

      console.log(`Processing ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB) using backend...`);

      // Send to backend
      const response = await fetch(`${this.backendUrl}/api/process-document`, {
        method: 'POST',
        body: formData,
        // Don't set Content-Type header - browser will set it with boundary for FormData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Backend processing failed: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Backend processing failed');
      }

      console.log(`Backend processing complete: ${result.data.analysis.chunkCount} chunks created`);

      // Transform result to match frontend expectations
      return {
        success: true,
        text: result.data.originalText,
        chunks: result.data.chunks,
        metadata: {
          ...result.data.metadata,
          processingMethod: 'backend',
          processedAt: result.data.processedAt,
          analysis: result.data.analysis,
          sections: result.data.sections
        }
      };

    } catch (error) {
      console.error('Backend document processing error:', error);
      
      // Return error in consistent format
      return {
        success: false,
        error: error.message || 'Backend processing failed',
        fallback: true // Indicates frontend should try fallback processing
      };
    }
  }

  /**
   * Get file information without processing
   */
  async getFileInfo(file) {
    try {
      if (!file) {
        throw new Error('No file provided');
      }

      const formData = new FormData();
      formData.append('document', file);

      const response = await fetch(`${this.backendUrl}/api/file-info`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to get file info: ${response.status}`);
      }

      const result = await response.json();
      return result.success ? result.data : null;

    } catch (error) {
      console.error('Backend file info error:', error);
      return null;
    }
  }

  /**
   * Process document using backend only (no fallback)
   */
  async processDocumentBackendOnly(file, options = {}) {
    console.log('🚀 Processing document using backend server only - maximum performance mode');
    
    // Check backend health first
    const healthCheck = await this.checkBackendHealth();
    if (!healthCheck.available) {
      return {
        success: false,
        error: 'Backend server is not available. Please ensure the server is running on port 5000.',
        requiresBackend: true
      };
    }
    
    // Process using backend
    const backendResult = await this.processDocument(file, options);
    
    if (backendResult.success) {
      console.log('✅ Backend-only processing completed successfully');
      return {
        ...backendResult,
        metadata: {
          ...backendResult.metadata,
          processingMethod: 'backend-only'
        }
      };
    }
    
    // Backend failed - no fallback
    return {
      success: false,
      error: backendResult.error || 'Backend processing failed',
      requiresBackend: true,
      metadata: {
        processingMethod: 'backend-failed',
        backendError: backendResult.error
      }
    };
  }
}

export default BackendDocumentProcessor;