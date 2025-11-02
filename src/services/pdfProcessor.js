import * as pdfjsLib from 'pdfjs-dist';

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export class PDFProcessor {
  /**
   * Extract text from PDF file
   * @param {File} file - PDF file to process
   * @returns {Promise<string>} - Extracted text content
   */
  static async extractTextFromPDF(file) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      let fullText = '';
      
      // Extract text from each page
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        
        // Combine text items with proper spacing
        const pageText = textContent.items
          .map(item => item.str)
          .join(' ')
          .replace(/\s+/g, ' ') // Normalize whitespace
          .trim();
        
        if (pageText) {
          fullText += pageText + '\n\n';
        }
      }
      
      return fullText.trim();
    } catch (error) {
      console.error('Error extracting text from PDF:', error);
      throw new Error('Failed to extract text from PDF. Please ensure the file is a valid PDF.');
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
   * Validate PDF file
   * @param {File} file - File to validate
   * @returns {Object} - Validation result
   */
  static validatePDFFile(file) {
    const errors = [];
    
    // Check file type
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      errors.push('File must be a PDF');
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
   * Extract metadata from PDF
   * @param {File} file - PDF file
   * @returns {Promise<Object>} - PDF metadata
   */
  static async extractPDFMetadata(file) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const metadata = await pdf.getMetadata();
      
      return {
        title: metadata.info.Title || '',
        author: metadata.info.Author || '',
        subject: metadata.info.Subject || '',
        creator: metadata.info.Creator || '',
        producer: metadata.info.Producer || '',
        creationDate: metadata.info.CreationDate || null,
        modificationDate: metadata.info.ModDate || null,
        pageCount: pdf.numPages,
        fileSize: file.size,
        fileName: file.name
      };
    } catch (error) {
      console.error('Error extracting PDF metadata:', error);
      return {
        pageCount: 0,
        fileSize: file.size,
        fileName: file.name,
        error: 'Could not extract metadata'
      };
    }
  }

  /**
   * Process resume PDF and extract structured information
   * @param {File} file - PDF file to process
   * @returns {Promise<Object>} - Processed resume data
   */
  static async processResumePDF(file) {
    // Validate file first
    const validation = this.validatePDFFile(file);
    if (!validation.isValid) {
      throw new Error(validation.errors.join(', '));
    }

    try {
      // Extract text and metadata in parallel
      const [text, metadata] = await Promise.all([
        this.extractTextFromPDF(file),
        this.extractPDFMetadata(file)
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
      console.error('Error processing resume PDF:', error);
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