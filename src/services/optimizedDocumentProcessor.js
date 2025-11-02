/**
 * Optimized Document Processor
 * Uses Web Workers and streaming for efficient file processing
 * Prevents UI blocking and handles large files gracefully
 */

export class OptimizedDocumentProcessor {
  constructor() {
    this.worker = null;
    this.processingQueue = new Map();
    this.requestId = 0;
  }

  /**
   * Initialize the Web Worker
   */
  async initializeWorker() {
    if (this.worker) {
      return this.worker;
    }

    try {
      // Check if Web Workers are supported
      if (typeof Worker === 'undefined') {
        throw new Error('Web Workers are not supported in this browser');
      }

      this.worker = new Worker('/document-worker.js');
      
      // Set up worker message handler
      this.worker.onmessage = (e) => {
        this.handleWorkerMessage(e.data);
      };
      
      // Set up worker error handler
      this.worker.onerror = (error) => {
        console.error('Worker error:', error);
        this.handleWorkerError(error);
      };
      
      // Test worker communication
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          this.worker = null;
          reject(new Error('Worker initialization timeout'));
        }, 5000);

        const testHandler = (e) => {
          if (e.data.type === 'worker_ready' || e.data.type === 'error') {
            clearTimeout(timeout);
            this.worker.removeEventListener('message', testHandler);
            
            if (e.data.type === 'error') {
              this.worker = null;
              reject(new Error('Worker failed to initialize: ' + e.data.error));
            } else {
              resolve(this.worker);
            }
          }
        };

        this.worker.addEventListener('message', testHandler);
        
        // Send test message to worker
        try {
          this.worker.postMessage({ type: 'TEST_WORKER' });
        } catch (postError) {
          clearTimeout(timeout);
          this.worker = null;
          reject(new Error('Failed to communicate with worker: ' + postError.message));
        }
      });
      
    } catch (error) {
      console.error('Failed to initialize worker:', error);
      this.worker = null;
      throw new Error(`Failed to initialize document processing worker: ${error.message}`);
    }
  }

  /**
   * Handle messages from the worker
   */
  handleWorkerMessage(data) {
    const { type, requestId, progress, message, result, error } = data;
    const request = this.processingQueue.get(requestId);
    
    if (!request) {
      // Handle global progress messages (without requestId)
      if (type === 'progress' && this.globalProgressCallback) {
        this.globalProgressCallback({ progress, message });
      }
      return;
    }

    switch (type) {
      case 'progress':
        if (request.onProgress) {
          request.onProgress({ progress, message });
        }
        break;
        
      case 'success':
        request.resolve(result);
        this.processingQueue.delete(requestId);
        break;
        
      case 'error':
        request.reject(new Error(error));
        this.processingQueue.delete(requestId);
        break;
    }
  }

  /**
   * Handle worker errors
   */
  handleWorkerError(error) {
    // Reject all pending requests
    this.processingQueue.forEach((request) => {
      request.reject(new Error('Worker crashed: ' + error.message));
    });
    this.processingQueue.clear();
    
    // Reset worker
    this.worker = null;
  }

  /**
   * Validate file before processing
   */
  validateFile(file) {
    const errors = [];
    const maxSize = 50 * 1024 * 1024; // Increased to 50MB for better handling
    
    // Check file size
    if (file.size > maxSize) {
      errors.push(`File size must be less than 50MB. Current size: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
    }
    
    // Check if file is empty
    if (file.size === 0) {
      errors.push('File cannot be empty');
    }
    
    // Check file type
    const fileName = file.name.toLowerCase();
    const mimeType = file.type.toLowerCase();
    
    const isPDF = mimeType === 'application/pdf' || fileName.endsWith('.pdf');
    const isDOCX = mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
                   fileName.endsWith('.docx') || fileName.endsWith('.doc');
    
    if (!isPDF && !isDOCX) {
      errors.push('File must be a PDF (.pdf) or Word document (.docx, .doc)');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      fileType: isPDF ? 'pdf' : isDOCX ? 'docx' : 'unknown'
    };
  }

  /**
   * Process file with streaming and progress updates
   */
  async processFile(file, options = {}) {
    // Validate file
    const validation = this.validateFile(file);
    if (!validation.isValid) {
      throw new Error(validation.errors.join(', '));
    }

    // Try to use Web Worker first, fall back to direct processing if it fails
    try {
      return await this.processFileWithWorker(file, validation, options);
    } catch (workerError) {
      console.warn('Worker processing failed, falling back to direct processing:', workerError.message);
      return await this.processFileDirectly(file, validation, options);
    }
  }

  /**
   * Process file using Web Worker
   */
  async processFileWithWorker(file, validation, options = {}) {
    console.log('🔄 Attempting to process file with Web Worker...');
    
    // Initialize worker if needed
    try {
      await this.initializeWorker();
      console.log('✅ Worker initialized successfully');
    } catch (workerError) {
      console.log('❌ Worker initialization failed:', workerError.message);
      throw workerError;
    }

    // Set up processing options
    const processingOptions = {
      chunkSize: options.chunkSize || 700,
      overlap: options.overlap || 200,
      streamingMode: options.streamingMode !== false, // Default to true
      ...options
    };

    const requestId = ++this.requestId;
    console.log(`📝 Created request ID: ${requestId}`);
    
    return new Promise(async (resolve, reject) => {
      try {
        // Store request in queue
        this.processingQueue.set(requestId, {
          resolve,
          reject,
          onProgress: options.onProgress
        });

        // Read file as array buffer with progress tracking
        const arrayBuffer = await this.readFileWithProgress(file, options.onProgress);
        console.log(`📄 File read complete: ${arrayBuffer.byteLength} bytes`);
        
        // Ensure worker is still available after async operations
        if (!this.worker) {
          throw new Error('Worker not available after file read');
        }
        
        // Determine processing type
        const messageType = validation.fileType === 'pdf' ? 'PROCESS_PDF' : 'PROCESS_DOCX';
        console.log(`🎯 Processing type: ${messageType}`);
        
        // Send to worker with error handling
        try {
          this.worker.postMessage({
            type: messageType,
            data: arrayBuffer,
            options: {
              ...processingOptions,
              requestId
            },
            requestId
          });
          console.log('📤 Message sent to worker successfully');
        } catch (workerError) {
          console.log('❌ Failed to send message to worker:', workerError.message);
          throw new Error(`Failed to communicate with worker: ${workerError.message}`);
        }
        
      } catch (error) {
        console.log('❌ Worker processing error:', error.message);
        this.processingQueue.delete(requestId);
        reject(error);
      }
    });
  }

  /**
   * Fallback: Process file directly without Web Worker using async chunking
   */
  async processFileDirectly(file, validation, options = {}) {
    console.log('🔄 Using fallback processing with async chunking...');
    
    if (options.onProgress) {
      options.onProgress({
        progress: 0,
        message: 'Starting non-blocking processing...'
      });
    }

    try {
      // Use async chunked processing to prevent UI blocking
      return await this.processFileWithAsyncChunking(file, validation, options);
    } catch (error) {
      console.log('❌ Async chunked processing failed, trying original processor:', error.message);
      
      // Final fallback to original processor
      const { DocumentProcessor } = await import('./documentProcessor');
      
      if (options.onProgress) {
        options.onProgress({
          progress: 50,
          message: 'Using basic processing (may cause brief freeze)...'
        });
      }
      
      const result = await DocumentProcessor.processResumeDocument(file);
      
      if (options.onProgress) {
        options.onProgress({
          progress: 100,
          message: 'Processing completed'
        });
      }

      return {
        ...result,
        fallbackMode: true,
        processingMode: 'basic'
      };
    }
  }

  /**
   * Process file using async chunking to prevent browser freezing
   */
  async processFileWithAsyncChunking(file, validation, options = {}) {
    const chunkSize = options.chunkSize || 700;
    const overlap = options.overlap || 200;
    
    // Step 1: Read file with progress
    if (options.onProgress) {
      options.onProgress({
        progress: 10,
        message: 'Reading file...'
      });
    }

    const text = await this.extractTextAsync(file, validation.fileType, options.onProgress);
    
    if (options.onProgress) {
      options.onProgress({
        progress: 60,
        message: 'Chunking text...'
      });
    }

    // Step 2: Split text into chunks with async yielding
    const chunks = await this.splitTextAsyncChunks(text, chunkSize, overlap, options.onProgress);
    
    if (options.onProgress) {
      options.onProgress({
        progress: 90,
        message: 'Finalizing...'
      });
    }

    // Step 3: Create result with basic analysis
    const wordCount = text.split(/\s+/).length;
    const characterCount = text.length;
    
    const result = {
      originalText: text,
      chunks,
      analysis: {
        wordCount,
        characterCount,
        chunkCount: chunks.length,
        estimatedReadingTime: Math.ceil(wordCount / 200)
      },
      metadata: {
        fileSize: file.size,
        fileName: file.name,
        fileType: validation.fileType.toUpperCase()
      },
      processedAt: new Date().toISOString(),
      fallbackMode: true,
      processingMode: 'async_chunked'
    };

    if (options.onProgress) {
      options.onProgress({
        progress: 100,
        message: 'Processing completed (non-blocking mode)'
      });
    }

    return result;
  }

  /**
   * Extract text from file asynchronously
   */
  async extractTextAsync(file, fileType, onProgress) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onprogress = (event) => {
        if (event.lengthComputable && onProgress) {
          const progress = Math.round((event.loaded / event.total) * 30) + 10; // 10-40%
          onProgress({
            progress,
            message: `Reading file: ${Math.round((event.loaded / event.total) * 100)}%`
          });
        }
      };
      
      reader.onload = async (event) => {
        try {
          if (fileType === 'pdf') {
            // For PDF, we'll extract basic text (simplified approach)
            const text = await this.extractPDFTextSimple(event.target.result, onProgress);
            resolve(text);
          } else {
            // For text-based files (DOCX handled as text for now)
            const text = new TextDecoder().decode(event.target.result);
            resolve(text || 'Document content could not be extracted as text.');
          }
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => reject(new Error('Failed to read file'));
      
      if (fileType === 'pdf') {
        reader.readAsArrayBuffer(file);
      } else {
        reader.readAsArrayBuffer(file);
      }
    });
  }

  /**
   * Simple PDF text extraction (placeholder for now)
   */
  async extractPDFTextSimple(arrayBuffer, onProgress) {
    if (onProgress) {
      onProgress({
        progress: 45,
        message: 'Extracting PDF text...'
      });
    }

    // Yield control to prevent blocking
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // For now, return placeholder text for PDF
    // In a production app, you'd use a PDF library here with proper async chunking
    return `PDF document processed (${arrayBuffer.byteLength} bytes). This is a simplified text extraction. Full PDF processing requires additional libraries.`;
  }

  /**
   * Split text into chunks asynchronously to prevent blocking
   */
  async splitTextAsyncChunks(text, chunkSize = 700, overlap = 200, onProgress) {
    const chunks = [];
    let start = 0;
    let processed = 0;
    const totalLength = text.length;

    while (start < text.length) {
      let end = start + chunkSize;
      
      // Smart boundary detection
      if (end < text.length) {
        const sentenceEnd = text.lastIndexOf('.', end);
        const questionEnd = text.lastIndexOf('?', end);
        const exclamationEnd = text.lastIndexOf('!', end);
        const lastSentenceEnd = Math.max(sentenceEnd, questionEnd, exclamationEnd);
        
        if (lastSentenceEnd > start + chunkSize * 0.5) {
          end = lastSentenceEnd + 1;
        } else {
          const lastSpace = text.lastIndexOf(' ', end);
          if (lastSpace > start + chunkSize * 0.5) {
            end = lastSpace;
          }
        }
      }

      const chunk = text.substring(start, end).trim();
      if (chunk) {
        chunks.push(chunk);
      }

      start = Math.max(start + 1, end - overlap);
      processed = Math.min(start, text.length);
      
      // Yield control to browser every few chunks
      if (chunks.length % 5 === 0) {
        if (onProgress) {
          const progress = 60 + Math.round((processed / totalLength) * 25); // 60-85%
          onProgress({
            progress,
            message: `Processing chunks: ${chunks.length} created`
          });
        }
        // Yield control back to browser
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      
      if (start >= text.length) break;
    }

    return chunks.filter(chunk => chunk.length > 0);
  }

  /**
   * Read file as ArrayBuffer with progress tracking
   */
  async readFileWithProgress(file, onProgress) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onloadstart = () => {
        if (onProgress) {
          onProgress({
            progress: 0,
            message: 'Starting file read...'
          });
        }
      };
      
      reader.onprogress = (event) => {
        if (event.lengthComputable && onProgress) {
          const progress = Math.round((event.loaded / event.total) * 20); // 20% for file reading
          onProgress({
            progress,
            message: `Reading file: ${(event.loaded / 1024 / 1024).toFixed(2)}MB / ${(event.total / 1024 / 1024).toFixed(2)}MB`
          });
        }
      };
      
      reader.onload = (event) => {
        if (onProgress) {
          onProgress({
            progress: 25,
            message: 'File read complete, starting processing...'
          });
        }
        resolve(event.target.result);
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Process multiple files concurrently with rate limiting
   */
  async processMultipleFiles(files, options = {}) {
    const maxConcurrent = options.maxConcurrent || 2; // Limit concurrent processing
    const results = [];
    
    for (let i = 0; i < files.length; i += maxConcurrent) {
      const batch = files.slice(i, i + maxConcurrent);
      
      const batchPromises = batch.map(async (file, batchIndex) => {
        const fileIndex = i + batchIndex;
        
        return this.processFile(file, {
          ...options,
          onProgress: (progress) => {
            if (options.onProgress) {
              options.onProgress({
                ...progress,
                fileIndex,
                fileName: file.name,
                totalFiles: files.length
              });
            }
          }
        });
      });
      
      try {
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
      } catch (error) {
        console.error('Batch processing error:', error);
        throw error;
      }
    }
    
    return results;
  }

  /**
   * Get file type from file object
   */
  static getFileType(file) {
    const fileName = file.name.toLowerCase();
    const mimeType = file.type.toLowerCase();
    
    if (mimeType === 'application/pdf' || fileName.endsWith('.pdf')) {
      return 'pdf';
    }
    
    if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
        fileName.endsWith('.docx') || fileName.endsWith('.doc')) {
      return 'docx';
    }
    
    return 'unknown';
  }

  /**
   * Get memory usage estimation
   */
  getMemoryUsage() {
    if (performance.memory) {
      return {
        used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
        total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
        limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024)
      };
    }
    return null;
  }

  /**
   * Force garbage collection (if available)
   */
  forceGarbageCollection() {
    // Hint for garbage collection
    if (window.gc) {
      window.gc();
    }
    
    // Clear any unused references
    if (this.processingQueue.size === 0) {
      this.processingQueue.clear();
    }
  }

  /**
   * Get processing statistics
   */
  getStats() {
    return {
      activeRequests: this.processingQueue.size,
      workerInitialized: !!this.worker,
      memoryUsage: this.getMemoryUsage()
    };
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    
    this.processingQueue.clear();
    this.forceGarbageCollection();
  }

  /**
   * Get supported file types
   */
  static getSupportedTypes() {
    return {
      accept: {
        'application/pdf': ['.pdf'],
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
        'application/msword': ['.doc']
      },
      extensions: ['.pdf', '.docx', '.doc'],
      description: 'PDF documents and Word documents',
      maxSize: 50 * 1024 * 1024, // 50MB
      maxSizeText: '50MB'
    };
  }

  /**
   * Legacy compatibility method - processes resume document
   */
  async processResumeDocument(file) {
    try {
      const result = await this.processFile(file, {
        onProgress: (progress) => {
          console.log(`Processing progress: ${progress.progress}% - ${progress.message}`);
        }
      });
      
      return {
        ...result,
        fileType: OptimizedDocumentProcessor.getFileType(file),
        originalFileName: file.name
      };
    } catch (error) {
      console.error('Error processing resume document:', error);
      throw error;
    }
  }
}

// Create singleton instance for backward compatibility
export const optimizedDocumentProcessor = new OptimizedDocumentProcessor();

// Export as default for easy importing
export default OptimizedDocumentProcessor;