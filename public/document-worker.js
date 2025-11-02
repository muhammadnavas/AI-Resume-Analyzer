/**
 * Web Worker for handling heavy document processing tasks
 * This runs off the main thread to prevent UI blocking
 */

// Note: PDF.js will be loaded differently to avoid CORS issues
// We'll use a simpler approach for now

class DocumentWorkerProcessor {
  constructor() {
    // We'll handle PDF processing differently to avoid CORS issues
    this.initialized = true;
  }

  /**
   * Process PDF file - Simplified version without external dependencies
   * This will use the fallback processor on the main thread for actual PDF processing
   */
  async processPDFFile(arrayBuffer, options = {}) {
    const { chunkSize = 700, overlap = 200 } = options;
    
    try {
      // Send progress updates
      self.postMessage({
        type: 'progress',
        progress: 25,
        message: 'Processing PDF file...',
        requestId: options.requestId
      });
      
      // Since we can't easily use PDF.js in worker without CORS issues,
      // we'll signal that this should use fallback processing
      throw new Error('PDF processing requires fallback to main thread');
      
    } catch (error) {
      throw new Error(`PDF processing failed: ${error.message}`);
    }
  }

  /**
   * Process DOCX file (simulated - in real implementation, would use mammoth.js)
   */
  async processDOCXFile(arrayBuffer, options = {}) {
    const { chunkSize = 700, overlap = 200 } = options;
    
    try {
      // For now, we'll simulate DOCX processing
      // In a real implementation, you'd import mammoth.js here
      
      // Send progress updates
      self.postMessage({
        type: 'progress',
        progress: 50,
        message: 'Extracting text from DOCX...',
        requestId: options.requestId
      });
      
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Placeholder text extraction (replace with actual mammoth.js implementation)
      const text = `Placeholder DOCX content extracted from file of size ${arrayBuffer.byteLength} bytes.`;
      
      const chunks = this.splitTextIntoChunks(text, chunkSize, overlap);
      const wordCount = text.split(/\s+/).length;
      
      return {
        originalText: text,
        chunks,
        analysis: {
          wordCount,
          characterCount: text.length,
          chunkCount: chunks.length,
          estimatedReadingTime: Math.ceil(wordCount / 200)
        },
        metadata: {
          fileSize: arrayBuffer.byteLength,
          fileType: 'DOCX'
        },
        processedAt: new Date().toISOString()
      };
      
    } catch (error) {
      throw new Error(`DOCX processing failed: ${error.message}`);
    }
  }

  /**
   * Split text into chunks with smart boundary detection
   */
  splitTextIntoChunks(text, chunkSize = 700, overlap = 200) {
    if (!text || text.length <= chunkSize) {
      return [text];
    }

    const chunks = [];
    let start = 0;

    while (start < text.length) {
      let end = start + chunkSize;
      
      // If this is not the last chunk, try to break at a sentence or word boundary
      if (end < text.length) {
        // Look for sentence boundary
        const sentenceEnd = text.lastIndexOf('.', end);
        const questionEnd = text.lastIndexOf('?', end);
        const exclamationEnd = text.lastIndexOf('!', end);
        
        const lastSentenceEnd = Math.max(sentenceEnd, questionEnd, exclamationEnd);
        
        if (lastSentenceEnd > start + chunkSize * 0.5) {
          end = lastSentenceEnd + 1;
        } else {
          // Look for word boundary
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

      // Calculate next start position with overlap
      start = Math.max(start + 1, end - overlap);
      
      // Prevent infinite loop
      if (start >= text.length) {
        break;
      }
    }

    return chunks.filter(chunk => chunk.length > 0);
  }
}

// Initialize processor instance
const processor = new DocumentWorkerProcessor();

// Listen for messages from main thread
self.onmessage = async function(e) {
  const { type, data, options = {}, requestId } = e.data;
  
  try {
    switch (type) {
      case 'TEST_WORKER':
        // Respond to test message to confirm worker is ready
        self.postMessage({
          type: 'worker_ready',
          message: 'Worker initialized successfully'
        });
        break;
        
      case 'PROCESS_PDF':
        self.postMessage({
          type: 'progress',
          progress: 0,
          message: 'Starting PDF processing...',
          requestId
        });
        
        const pdfResult = await processor.processPDFFile(data, options);
        
        self.postMessage({
          type: 'success',
          result: pdfResult,
          requestId
        });
        break;
        
      case 'PROCESS_DOCX':
        self.postMessage({
          type: 'progress',
          progress: 0,
          message: 'Starting DOCX processing...',
          requestId
        });
        
        const docxResult = await processor.processDOCXFile(data, options);
        
        self.postMessage({
          type: 'success',
          result: docxResult,
          requestId
        });
        break;
        
      default:
        throw new Error(`Unknown message type: ${type}`);
    }
    
  } catch (error) {
    self.postMessage({
      type: 'error',
      error: error.message,
      requestId
    });
  }
};

// Handle worker errors
self.onerror = function(error) {
  self.postMessage({
    type: 'error',
    error: error.message || 'Worker error occurred'
  });
};