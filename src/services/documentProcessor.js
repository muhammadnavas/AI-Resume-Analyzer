import { DOCXProcessor } from './docxProcessor';
import { PDFProcessor } from './pdfProcessor';

export class DocumentProcessor {
  /**
   * Determine file type from file object
   * @param {File} file - File to check
   * @returns {string} - File type ('pdf', 'docx', 'unknown')
   */
  static getFileType(file) {
    const fileName = file.name.toLowerCase();
    const mimeType = file.type.toLowerCase();
    
    // Check for PDF
    if (mimeType === 'application/pdf' || fileName.endsWith('.pdf')) {
      return 'pdf';
    }
    
    // Check for DOCX
    if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
        fileName.endsWith('.docx')) {
      return 'docx';
    }
    
    // Check for older DOC format
    if (mimeType === 'application/msword' || fileName.endsWith('.doc')) {
      return 'docx'; // We'll handle .doc files with the same processor
    }
    
    return 'unknown';
  }

  /**
   * Validate file type and format
   * @param {File} file - File to validate
   * @returns {Object} - Validation result
   */
  static validateFile(file) {
    const fileType = this.getFileType(file);
    
    if (fileType === 'unknown') {
      return {
        isValid: false,
        errors: ['File must be a PDF (.pdf) or Word document (.docx, .doc)'],
        fileType: 'unknown'
      };
    }
    
    // Use appropriate processor for validation
    if (fileType === 'pdf') {
      return { ...PDFProcessor.validatePDFFile(file), fileType };
    } else if (fileType === 'docx') {
      return { ...DOCXProcessor.validateDOCXFile(file), fileType };
    }
    
    return {
      isValid: false,
      errors: ['Unsupported file type'],
      fileType
    };
  }

  /**
   * Process resume document (PDF or DOCX)
   * @param {File} file - Document file to process
   * @returns {Promise<Object>} - Processed resume data
   */
  static async processResumeDocument(file) {
    // Validate file first
    const validation = this.validateFile(file);
    if (!validation.isValid) {
      throw new Error(validation.errors.join(', '));
    }

    const fileType = validation.fileType;
    
    try {
      let result;
      
      if (fileType === 'pdf') {
        result = await PDFProcessor.processResumePDF(file);
      } else if (fileType === 'docx') {
        result = await DOCXProcessor.processResumeDOCX(file);
      } else {
        throw new Error('Unsupported file type');
      }
      
      // Add file type information to result
      result.fileType = fileType;
      result.originalFileName = file.name;
      
      return result;
    } catch (error) {
      console.error(`Error processing ${fileType.toUpperCase()} document:`, error);
      throw new Error(`Failed to process ${fileType.toUpperCase()} document: ${error.message}`);
    }
  }

  /**
   * Get supported file types for display
   * @returns {Object} - Supported file types information
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
      maxSize: 10 * 1024 * 1024, // 10MB
      maxSizeText: '10MB'
    };
  }

  /**
   * Extract text from any supported document
   * @param {File} file - Document file
   * @returns {Promise<string>} - Extracted text
   */
  static async extractText(file) {
    const fileType = this.getFileType(file);
    
    if (fileType === 'pdf') {
      return await PDFProcessor.extractTextFromPDF(file);
    } else if (fileType === 'docx') {
      return await DOCXProcessor.extractTextFromDOCX(file);
    } else {
      throw new Error('Unsupported file type for text extraction');
    }
  }

  /**
   * Get file icon based on file type
   * @param {string} fileType - File type ('pdf', 'docx', etc.)
   * @returns {string} - Icon name or emoji
   */
  static getFileIcon(fileType) {
    switch (fileType) {
      case 'pdf':
        return '📄';
      case 'docx':
        return '📝';
      default:
        return '📄';
    }
  }

  /**
   * Get file type color for UI
   * @param {string} fileType - File type
   * @returns {string} - Tailwind color classes
   */
  static getFileTypeColor(fileType) {
    switch (fileType) {
      case 'pdf':
        return 'from-red-500 to-red-600';
      case 'docx':
        return 'from-blue-500 to-blue-600';
      default:
        return 'from-gray-500 to-gray-600';
    }
  }
}