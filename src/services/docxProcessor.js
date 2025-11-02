import mammoth from 'mammoth';

export class DOCXProcessor {
  /**
   * Extract text from DOCX file
   * @param {File} file - DOCX file to process
   * @returns {Promise<string>} - Extracted text content
   */
  static async extractTextFromDOCX(file) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      
      if (result.messages && result.messages.length > 0) {
        console.warn('DOCX processing warnings:', result.messages);
      }
      
      return result.value.trim();
    } catch (error) {
      console.error('Error extracting text from DOCX:', error);
      throw new Error('Failed to extract text from DOCX. Please ensure the file is a valid Word document.');
    }
  }

  /**
   * Extract HTML from DOCX file with formatting
   * @param {File} file - DOCX file to process
   * @returns {Promise<string>} - Extracted HTML content
   */
  static async extractHTMLFromDOCX(file) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.convertToHtml({ arrayBuffer });
      
      if (result.messages && result.messages.length > 0) {
        console.warn('DOCX HTML processing warnings:', result.messages);
      }
      
      return result.value;
    } catch (error) {
      console.error('Error extracting HTML from DOCX:', error);
      throw new Error('Failed to extract HTML from DOCX.');
    }
  }

  /**
   * Split text into chunks for processing
   * @param {string} text - Text to split
   * @param {number} chunkSize - Maximum size of each chunk
   * @param {number} overlap - Overlap between chunks
   * @returns {Array<string>} - Array of text chunks
   */
  static splitTextIntoChunks(text, chunkSize = 700, overlap = 200) {
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

  /**
   * Validate DOCX file
   * @param {File} file - File to validate
   * @returns {Object} - Validation result
   */
  static validateDOCXFile(file) {
    const errors = [];
    
    // Check file type
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword'
    ];
    
    const hasValidType = validTypes.includes(file.type) || 
                        file.name.toLowerCase().endsWith('.docx') || 
                        file.name.toLowerCase().endsWith('.doc');
    
    if (!hasValidType) {
      errors.push('File must be a Word document (.docx or .doc)');
    }
    
    // Check file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      errors.push('File size must be less than 10MB');
    }
    
    // Check if file is empty
    if (file.size === 0) {
      errors.push('File cannot be empty');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Extract metadata from DOCX
   * @param {File} file - DOCX file
   * @returns {Promise<Object>} - DOCX metadata
   */
  static async extractDOCXMetadata(file) {
    try {
      // Basic metadata extraction
      return {
        title: '',
        author: '',
        subject: '',
        creator: 'Microsoft Word',
        producer: 'mammoth.js',
        creationDate: null,
        modificationDate: file.lastModified ? new Date(file.lastModified) : null,
        pageCount: 1, // DOCX doesn't have fixed pages like PDF
        fileSize: file.size,
        fileName: file.name,
        fileType: 'DOCX'
      };
    } catch (error) {
      console.error('Error extracting DOCX metadata:', error);
      return {
        pageCount: 1,
        fileSize: file.size,
        fileName: file.name,
        fileType: 'DOCX',
        error: 'Could not extract metadata'
      };
    }
  }

  /**
   * Process resume DOCX and extract structured information
   * @param {File} file - DOCX file to process
   * @returns {Promise<Object>} - Processed resume data
   */
  static async processResumeDOCX(file) {
    // Validate file first
    const validation = this.validateDOCXFile(file);
    if (!validation.isValid) {
      throw new Error(validation.errors.join(', '));
    }

    try {
      // Extract text and metadata in parallel
      const [text, metadata] = await Promise.all([
        this.extractTextFromDOCX(file),
        this.extractDOCXMetadata(file)
      ]);

      // Split text into chunks
      const chunks = this.splitTextIntoChunks(text);

      // Basic text analysis
      const wordCount = text.split(/\s+/).length;
      const characterCount = text.length;
      
      // Extract basic sections (simple pattern matching)
      const sections = this.extractBasicSections(text);

      return {
        originalText: text,
        chunks,
        metadata,
        analysis: {
          wordCount,
          characterCount,
          chunkCount: chunks.length,
          estimatedReadingTime: Math.ceil(wordCount / 200) // 200 words per minute
        },
        sections,
        processedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error processing resume DOCX:', error);
      throw new Error(`Failed to process resume: ${error.message}`);
    }
  }

  /**
   * Extract basic sections from resume text
   * @param {string} text - Resume text
   * @returns {Object} - Extracted sections
   */
  static extractBasicSections(text) {
    const sections = {
      contact: '',
      summary: '',
      experience: '',
      education: '',
      skills: '',
      other: ''
    };

    // Simple pattern matching for common section headers
    const sectionPatterns = {
      contact: /(?:contact|personal|address|phone|email)/i,
      summary: /(?:summary|objective|profile|about)/i,
      experience: /(?:experience|work|employment|career|professional)/i,
      education: /(?:education|academic|degree|university|college)/i,
      skills: /(?:skills|technical|competencies|expertise|technologies)/i
    };

    // Split text into paragraphs
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim());

    paragraphs.forEach(paragraph => {
      const lowerParagraph = paragraph.toLowerCase();
      let assigned = false;

      // Check which section this paragraph belongs to
      for (const [section, pattern] of Object.entries(sectionPatterns)) {
        if (pattern.test(lowerParagraph) || 
            (section === 'contact' && /[@.]/.test(paragraph))) {
          sections[section] += paragraph + '\n\n';
          assigned = true;
          break;
        }
      }

      // If no section matched, add to 'other'
      if (!assigned) {
        sections.other += paragraph + '\n\n';
      }
    });

    // Clean up sections
    Object.keys(sections).forEach(key => {
      sections[key] = sections[key].trim();
    });

    return sections;
  }
}