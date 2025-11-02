const express = require('express');
const cors = require('cors');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword'];
    if (allowedTypes.includes(file.mimetype) || 
        file.originalname.toLowerCase().endsWith('.pdf') || 
        file.originalname.toLowerCase().endsWith('.docx') || 
        file.originalname.toLowerCase().endsWith('.doc')) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF and DOCX files are allowed.'), false);
    }
  }
});

/**
 * Helper function to split text into chunks
 */
function splitTextIntoChunks(text, chunkSize = 700, overlap = 200) {
  if (!text || text.length <= chunkSize) {
    return [text];
  }

  const chunks = [];
  let start = 0;

  while (start < text.length) {
    let end = start + chunkSize;
    
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

    start = Math.max(start + 1, end - overlap);
    
    if (start >= text.length) break;
  }

  return chunks.filter(chunk => chunk.length > 0);
}

/**
 * Extract basic sections from resume text
 */
function extractBasicSections(text) {
  const sections = {
    contact: '',
    summary: '',
    experience: '',
    education: '',
    skills: '',
    other: ''
  };

  const sectionPatterns = {
    contact: /(?:contact|personal|address|phone|email)/i,
    summary: /(?:summary|objective|profile|about)/i,
    experience: /(?:experience|work|employment|career|professional)/i,
    education: /(?:education|academic|degree|university|college)/i,
    skills: /(?:skills|technical|competencies|expertise|technologies)/i
  };

  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim());

  paragraphs.forEach(paragraph => {
    const lowerParagraph = paragraph.toLowerCase();
    let assigned = false;

    for (const [section, pattern] of Object.entries(sectionPatterns)) {
      if (pattern.test(lowerParagraph) || 
          (section === 'contact' && /[@.]/.test(paragraph))) {
        sections[section] += paragraph + '\n\n';
        assigned = true;
        break;
      }
    }

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

// Routes

/**
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'AI Resume Analyzer Backend is running',
    timestamp: new Date().toISOString()
  });
});

/**
 * Process document endpoint
 */
app.post('/api/process-document', upload.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        error: 'No file uploaded' 
      });
    }

    const file = req.file;
    const { chunkSize = 700, overlap = 200 } = req.body;
    
    console.log(`Processing file: ${file.originalname} (${file.size} bytes)`);

    let text = '';
    let metadata = {
      fileName: file.originalname,
      fileSize: file.size,
      fileType: '',
      pageCount: 1
    };

    // Process based on file type
    if (file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf')) {
      // Process PDF
      metadata.fileType = 'PDF';
      try {
        const pdfData = await pdfParse(file.buffer);
        text = pdfData.text;
        metadata.pageCount = pdfData.numpages || 1;
        console.log(`Extracted ${text.length} characters from PDF with ${metadata.pageCount} pages`);
      } catch (error) {
        console.error('PDF processing error:', error);
        throw new Error('Failed to process PDF file: ' + error.message);
      }
    } else if (file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
               file.originalname.toLowerCase().endsWith('.docx') ||
               file.originalname.toLowerCase().endsWith('.doc')) {
      // Process DOCX/DOC
      metadata.fileType = 'DOCX';
      try {
        const docxData = await mammoth.extractRawText({ buffer: file.buffer });
        text = docxData.value;
        console.log(`Extracted ${text.length} characters from DOCX`);
        
        if (docxData.messages && docxData.messages.length > 0) {
          console.warn('DOCX processing warnings:', docxData.messages);
        }
      } catch (error) {
        console.error('DOCX processing error:', error);
        throw new Error('Failed to process DOCX file: ' + error.message);
      }
    } else {
      throw new Error('Unsupported file type');
    }

    if (!text || text.trim().length === 0) {
      throw new Error('No text could be extracted from the document');
    }

    // Split text into chunks
    const chunks = splitTextIntoChunks(text.trim(), parseInt(chunkSize), parseInt(overlap));
    
    // Basic text analysis
    const wordCount = text.split(/\s+/).length;
    const characterCount = text.length;
    
    // Extract basic sections
    const sections = extractBasicSections(text);

    const result = {
      success: true,
      data: {
        originalText: text.trim(),
        chunks,
        metadata,
        analysis: {
          wordCount,
          characterCount,
          chunkCount: chunks.length,
          estimatedReadingTime: Math.ceil(wordCount / 200)
        },
        sections,
        processedAt: new Date().toISOString(),
        processingMode: 'server'
      }
    };

    console.log(`Processing complete: ${chunks.length} chunks created`);
    
    res.json(result);

  } catch (error) {
    console.error('Document processing error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to process document'
    });
  }
});

/**
 * Get file information without processing
 */
app.post('/api/file-info', upload.single('document'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        error: 'No file uploaded' 
      });
    }

    const file = req.file;
    let fileType = 'unknown';
    
    if (file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf')) {
      fileType = 'pdf';
    } else if (file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
               file.originalname.toLowerCase().endsWith('.docx') ||
               file.originalname.toLowerCase().endsWith('.doc')) {
      fileType = 'docx';
    }

    res.json({
      success: true,
      data: {
        fileName: file.originalname,
        fileSize: file.size,
        fileSizeMB: (file.size / 1024 / 1024).toFixed(2),
        fileType,
        mimeType: file.mimetype
      }
    });

  } catch (error) {
    console.error('File info error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to get file information'
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'File size too large. Maximum size is 50MB.'
      });
    }
  }
  
  console.error('Unhandled error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 AI Resume Analyzer Backend running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`📄 Document processing: http://localhost:${PORT}/api/process-document`);
});

module.exports = app;