/**
 * Text formatter utility for cleaning and formatting AI-generated text
 */

export class TextFormatter {
  /**
   * Format text by preserving important markdown and improving readability
   * @param {string} text - Raw text from AI
   * @returns {string} - Formatted text
   */
  static formatAnalysisText(text) {
    if (!text) return '';

    let formatted = text;

    // Remove markdown headers (# ## ###) but preserve content
    formatted = formatted.replace(/^#{1,6}\s+/gm, '');
    
    // Remove asterisks and other markdown formatting
    formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '$1'); // Remove bold
    formatted = formatted.replace(/\*([^*]+)\*/g, '$1'); // Remove italic
    formatted = formatted.replace(/`([^`]+)`/g, '$1'); // Remove code
    
    // Clean up excessive whitespace while preserving structure
    formatted = formatted.replace(/[ \t]{3,}/g, ' ');
    
    // Normalize line breaks (max 2 consecutive)
    formatted = formatted.replace(/\n{3,}/g, '\n\n');
    
    // Clean up bullet points - normalize different bullet styles
    formatted = formatted.replace(/^[\s]*[-•*]\s+/gm, '• ');
    formatted = formatted.replace(/^[\s]*(\d+)[.)]\s+/gm, '$1. ');
    
    // Remove extra spaces at line beginnings/ends
    formatted = formatted.replace(/^[ \t]+|[ \t]+$/gm, '');
    
    // Clean up double spaces
    formatted = formatted.replace(/  +/g, ' ');
    
    // Trim overall whitespace
    formatted = formatted.trim();

    return formatted;
  }

  /**
   * Enhanced method to detect and format structured content with ChatGPT-like bullet points
   * @param {string} text - Raw text content
   * @returns {Object} - Structured content object with enhanced formatting
   */
  static parseStructuredContent(text) {
    if (!text || typeof text !== 'string') return { type: 'text', content: text || 'No content available' };

    // First, clean and filter the text
    const cleanedText = this.filterUnwantedContent(this.formatAnalysisText(text));
    
    // Handle edge case where cleaning results in empty text
    if (!cleanedText || cleanedText.trim().length === 0) {
      return { type: 'text', content: 'Content could not be processed' };
    }
    
    // Convert paragraphs to bullet points for better ChatGPT-like formatting
    const bulletizedText = this.convertToBulletPoints(cleanedText);
    const lines = bulletizedText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    // Enhanced pattern detection for better content structure
    const listPattern = /^(?:[-•*]|\d+[.)]|[a-z][.)])\s+/i;
    const headerPattern = /^[A-Z][A-Z\s&\-']{3,}(?::|$)/;
    const numberedHeaderPattern = /^\d+\.\s*[A-Z][A-Z\s&\-']{3,}/;
    
    const listLines = lines.filter(line => listPattern.test(line));
    const headerLines = lines.filter(line => headerPattern.test(line) || numberedHeaderPattern.test(line));
    
    // Determine content structure type - force structured sections for better display
    const hasHeaders = headerLines.length > 0;
    const hasList = listLines.length > 1; // Lowered threshold since we're converting to bullets
    
    // Always try to create structured content for better formatting
    if (hasHeaders) {
      return this.parseStructuredSections(lines);
    } else if (hasList || lines.length > 2) {
      return this.parseListContent(lines, listPattern);
    } else {
      // Convert remaining content to bullet format
      return this.parseAsBulletList(lines);
    }
  }

  /**
   * Convert paragraph content to bullet points for ChatGPT-like formatting
   * @param {string} text - Text to convert
   * @returns {string} - Text with bullet points
   */
  static convertToBulletPoints(text) {
    if (!text) return '';

    let converted = text;

    // Split into logical segments and convert to bullet points
    const segments = text.split(/\n\s*\n/).filter(segment => segment.trim().length > 0);
    
    if (segments.length > 1) {
      converted = segments.map(segment => {
        const lines = segment.split('\n').map(line => line.trim()).filter(line => line.length > 0);
        
        return lines.map((line, index) => {
          // Check if line is already a header or bullet
          if (line.match(/^(?:[-•*]|\d+[.)]|[A-Z][A-Z\s&\-']{3,}(?::|$))/)) {
            return line;
          }
          
          // Convert sentences to bullet points
          if (line.length > 30 && index === 0 && lines.length === 1) {
            // Single long line - split into sentences and bulletize
            const sentences = line.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 10);
            if (sentences.length > 1) {
              return sentences.map(sentence => `• ${sentence.trim()}`).join('\n');
            }
          }
          
          // Add bullet if not already present and line is substantial
          if (line.length > 15 && !line.match(/^[-•*]/)) {
            return `• ${line}`;
          }
          
          return line;
        }).join('\n');
      }).join('\n\n');
    } else {
      // Single segment - convert long lines to bullets
      const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
      
      converted = lines.map(line => {
        // Skip if already a header or bullet
        if (line.match(/^(?:[-•*]|\d+[.)]|[A-Z][A-Z\s&\-']{3,}(?::|$))/)) {
          return line;
        }
        
        // Convert long lines to bullet points by splitting sentences
        if (line.length > 80) {
          const sentences = line.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 10);
          if (sentences.length > 1) {
            return sentences.map(sentence => `• ${sentence.trim()}`).join('\n');
          }
        }
        
        // Add bullet to substantial lines
        if (line.length > 15) {
          return `• ${line}`;
        }
        
        return line;
      }).join('\n');
    }

    return converted;
  }

  /**
   * Parse content as a bullet list when no clear structure is detected
   * @param {Array} lines - Array of text lines
   * @returns {Object} - Bullet list structure
   */
  static parseAsBulletList(lines) {
    const items = lines.map(line => {
      // Ensure line has bullet point
      const content = line.replace(/^[-•*]\s*/, '').trim();
      return {
        type: 'bullet',
        content: content,
        priority: this.assessContentPriority(content),
        category: this.categorizeContent(content)
      };
    });

    return {
      type: 'enhanced_list',
      content: { general: items }
    };
  }

  /**
   * Parse content with clear sections and subsections - ensures bullet point format
   * @param {Array} lines - Array of text lines
   * @returns {Object} - Structured sections object
   */
  static parseStructuredSections(lines) {
    const sections = [];
    let currentSection = null;
    
    lines.forEach(line => {
      const isHeader = line.match(/^(?:\d+\.\s*)?[A-Z][A-Z\s&\-']{3,}(?::|$)/);
      const isBullet = line.match(/^(?:[-•*]|\d+[.)])\s+/);
      
      if (isHeader) {
        // Save previous section
        if (currentSection) sections.push(currentSection);
        
        // Start new section
        currentSection = {
          type: 'section',
          title: line.replace(/^\d+\.\s*/, '').replace(/:$/, '').trim(),
          items: []
        };
      } else if (currentSection && isBullet) {
        const content = line.replace(/^(?:[-•*]|\d+[.)])\s+/, '').trim();
        currentSection.items.push({
          type: 'bullet',
          content: content,
          priority: this.assessContentPriority(content)
        });
      } else if (currentSection && line.length > 15) {
        // Convert non-bullet content to bullets for consistency
        const bulletContent = line.replace(/^[-•*\s]*/, '').trim();
        
        // Split long paragraphs into multiple bullet points
        if (bulletContent.length > 100) {
          const sentences = bulletContent.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 10);
          sentences.forEach(sentence => {
            currentSection.items.push({
              type: 'bullet',
              content: sentence.trim(),
              priority: this.assessContentPriority(sentence)
            });
          });
        } else {
          currentSection.items.push({
            type: 'bullet',
            content: bulletContent,
            priority: this.assessContentPriority(bulletContent)
          });
        }
      }
    });
    
    if (currentSection) sections.push(currentSection);
    
    // Ensure all sections have bullet points
    sections.forEach(section => {
      section.items = section.items.map(item => ({
        ...item,
        type: 'bullet' // Force all items to be bullets for consistency
      }));
    });
    
    return { type: 'sections', content: sections };
  }

  /**
   * Parse list-focused content with better organization
   * @param {Array} lines - Array of text lines
   * @param {RegExp} listPattern - Pattern for list items
   * @returns {Object} - Structured list object
   */
  static parseListContent(lines, listPattern) {
    const processedItems = [];
    
    lines.forEach(line => {
      if (listPattern.test(line)) {
        const content = line.replace(listPattern, '').trim();
        const priority = this.assessContentPriority(content);
        
        processedItems.push({
          type: 'listItem',
          content: content,
          priority: priority,
          category: this.categorizeContent(content)
        });
      } else if (line.length > 10) {
        // Non-list content (headers, descriptions)
        processedItems.push({
          type: 'description',
          content: line,
          priority: this.assessContentPriority(line)
        });
      }
    });
    
    // Group similar content types
    const grouped = this.groupSimilarContent(processedItems);
    
    return {
      type: 'enhanced_list',
      content: grouped
    };
  }

  /**
   * Parse paragraph content with better readability
   * @param {Array} lines - Array of text lines
   * @returns {Object} - Enhanced paragraph structure
   */
  static parseParagraphContent(lines) {
    const paragraphs = [];
    
    lines.forEach(line => {
      if (line.length > 150) {
        // Split long paragraphs intelligently
        const sentences = this.intelligentSentenceSplit(line);
        sentences.forEach(sentence => {
          paragraphs.push({
            type: 'paragraph',
            content: sentence.trim(),
            length: 'long',
            readability: this.assessReadability(sentence)
          });
        });
      } else {
        paragraphs.push({
          type: 'paragraph',
          content: line,
          length: 'normal',
          readability: this.assessReadability(line)
        });
      }
    });
    
    return {
      type: 'enhanced_paragraphs',
      content: paragraphs
    };
  }

  /**
   * Assess content priority for better organization
   * @param {string} content - Content to assess
   * @returns {string} - Priority level (high, medium, low)
   */
  static assessContentPriority(content) {
    const highPriorityKeywords = /\b(?:achieved|increased|improved|reduced|led|managed|developed|created|designed|implemented|optimized|streamlined|delivered|executed|launched|built)\b/i;
    const mediumPriorityKeywords = /\b(?:experience|skills|knowledge|proficient|familiar|worked|assisted|participated|collaborated|supported)\b/i;
    
    if (highPriorityKeywords.test(content)) return 'high';
    if (mediumPriorityKeywords.test(content)) return 'medium';
    return 'low';
  }

  /**
   * Categorize content by type
   * @param {string} content - Content to categorize
   * @returns {string} - Content category
   */
  static categorizeContent(content) {
    if (content.match(/\b(?:years?|experience|background)\b/i)) return 'experience';
    if (content.match(/\b(?:skills?|technology|programming|software|tools?)\b/i)) return 'technical';
    if (content.match(/\b(?:education|degree|certification|training|course)\b/i)) return 'education';
    if (content.match(/\b(?:achieved|accomplished|delivered|increased|improved)\b/i)) return 'achievement';
    if (content.match(/\b(?:leadership|managed|led|team|project)\b/i)) return 'leadership';
    return 'general';
  }

  /**
   * Group similar content for better presentation
   * @param {Array} items - Content items to group
   * @returns {Array} - Grouped content items
   */
  static groupSimilarContent(items) {
    const groups = {};
    
    items.forEach(item => {
      const category = item.category || 'general';
      if (!groups[category]) groups[category] = [];
      groups[category].push(item);
    });
    
    // Sort groups by priority
    Object.keys(groups).forEach(category => {
      groups[category].sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return (priorityOrder[b.priority] || 1) - (priorityOrder[a.priority] || 1);
      });
    });
    
    return groups;
  }

  /**
   * Intelligent sentence splitting for better readability
   * @param {string} text - Text to split
   * @returns {Array} - Array of sentences
   */
  static intelligentSentenceSplit(text) {
    // Split at sentence boundaries but keep context
    let sentences = text.split(/(?<=[.!?])\s+(?=[A-Z])/);
    
    // If sentences are still too long, split at logical conjunctions
    const longSentences = sentences.filter(s => s.length > 100);
    if (longSentences.length > 0) {
      const newSentences = [];
      sentences.forEach(sentence => {
        if (sentence.length > 100) {
          const parts = sentence.split(/,\s+(?:and|or|but|however|furthermore|additionally|moreover|specifically|particularly)\s+/i);
          newSentences.push(...parts);
        } else {
          newSentences.push(sentence);
        }
      });
      sentences = newSentences;
    }
    
    return sentences.filter(s => s.trim().length > 0);
  }

  /**
   * Assess readability of content
   * @param {string} content - Content to assess
   * @returns {string} - Readability level
   */
  static assessReadability(content) {
    const wordCount = content.split(/\s+/).length;
    const avgWordLength = content.replace(/\s/g, '').length / wordCount;
    
    if (wordCount > 25 || avgWordLength > 6) return 'complex';
    if (wordCount > 15 || avgWordLength > 5) return 'medium';
    return 'simple';
  }

  /**
   * Convert text with section headers to JSX with proper formatting
   * @param {string} text - Text with section headers
   * @returns {Array} - Array of section objects
   */
  static formatAsJSXSections(text) {
    if (!text || typeof text !== 'string') return [];

    const sections = [];
    const lines = text.split('\n');
    let currentSection = { header: '', content: [], contentType: 'mixed' };

    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      
      // Enhanced header detection - more comprehensive patterns
      const isHeader = (
        // Numbered headers like "1. PROFESSIONAL BACKGROUND AND EXPERIENCE LEVEL"
        trimmedLine.match(/^[0-9]+\.\s*[A-Z][A-Z\s&\-']+$/i) ||
        // All caps headers with colon
        trimmedLine.match(/^[A-Z\s&\-']{4,}:$/i) ||
        // Headers with parentheses
        trimmedLine.match(/^[A-Z\s&\-']+\s*\([^)]+\):?$/i) ||
        // Multi-word headers with conjunctions (more comprehensive)
        trimmedLine.match(/^[A-Z][A-Z\s&\-']+ (OR|AND|FOR|OF|WITH|IN) [A-Z\s&\-']+$/i) ||
        // Common resume sections with broader matching
        trimmedLine.match(/^[A-Z\s&\-']+(EXPERIENCE|SKILLS|BACKGROUND|COMPETENCIES|LEVEL|ACHIEVEMENTS|QUALIFICATIONS|EXPERTISE|HIGHLIGHTS|STRENGTHS|WEAKNESSES|AREAS|RECOMMENDATIONS|SUGGESTIONS|IMPROVEMENTS|ANALYSIS|TRAJECTORY|FOCUS)[A-Z\s&\-']*$/i) ||
        // Simple all caps headers (minimum 4 characters, no lowercase)
        (trimmedLine.match(/^[A-Z\s&\-']{4,}$/) && !trimmedLine.match(/[a-z]/))
      );

      if (isHeader && trimmedLine.length > 0) {
        // Save previous section if it has content
        if (currentSection.header || currentSection.content.length > 0) {
          sections.push({ ...currentSection });
        }
        // Start new section
        currentSection = {
          header: trimmedLine.replace(/^[0-9]+\.\s*/, '').replace(/:$/, ''),
          content: [],
          contentType: 'mixed'
        };
      } else if (trimmedLine.length > 0) {
        // Detect content type for better formatting
        const isBulletPoint = /^[-•*]\s+/.test(trimmedLine);
        const isNumberedItem = /^\d+[.)]\s+/.test(trimmedLine);
        const isDashedItem = /^-\s+/.test(trimmedLine);
        const isAsteriskBullet = /^\*\s+/.test(trimmedLine);
        
        if (isBulletPoint || isNumberedItem || isDashedItem || isAsteriskBullet) {
          if (!currentSection.contentType || currentSection.contentType === 'mixed') {
            currentSection.contentType = 'list';
          }
          // Extract content after the marker
          let content = trimmedLine;
          if (isBulletPoint || isAsteriskBullet) {
            content = trimmedLine.replace(/^[-•*]\s+/, '');
          } else if (isNumberedItem) {
            content = trimmedLine.replace(/^\d+[.)]\s+/, '');
          } else if (isDashedItem) {
            content = trimmedLine.replace(/^-\s+/, '');
          }
          
          currentSection.content.push({
            type: 'listItem',
            content: content.trim()
          });
        } else {
          // Handle regular paragraphs - split overly long ones for readability
          if (trimmedLine.length > 150) {
            // Split at sentence boundaries
            const sentences = trimmedLine.split(/(?<=[.!?])\s+/);
            
            if (sentences.length > 1) {
              sentences.forEach((sentence, idx) => {
                if (sentence.trim().length > 0) {
                  currentSection.content.push({
                    type: 'paragraph',
                    content: sentence.trim(),
                    isPartOfLonger: idx > 0
                  });
                }
              });
            } else {
              // Try to break at logical conjunctions
              const logicalBreaks = trimmedLine.split(/(?:,\s+(?:and|or|but|however|furthermore|additionally|moreover)|\s+(?:while|whereas|although|because)\s+)/i);
              if (logicalBreaks.length > 1) {
                logicalBreaks.forEach((part, idx) => {
                  if (part.trim().length > 0) {
                    currentSection.content.push({
                      type: 'paragraph',
                      content: part.trim(),
                      isPartOfLonger: idx > 0
                    });
                  }
                });
              } else {
                currentSection.content.push({
                  type: 'paragraph',
                  content: trimmedLine
                });
              }
            }
          } else {
            currentSection.content.push({
              type: 'paragraph',
              content: trimmedLine
            });
          }
        }
      }
    });

    // Don't forget the last section
    if (currentSection.header || currentSection.content.length > 0) {
      sections.push(currentSection);
    }

    return sections;
  }

  /**
   * Enhanced method to format text with better markdown support
   * @param {string} text - Text to format
   * @returns {string} - Formatted text with preserved important formatting
   */
  static formatWithMarkdownSupport(text) {
    if (!text) return '';

    let formatted = text;
    
    // Normalize line breaks
    formatted = formatted.replace(/\r\n/g, '\n');
    
    // Clean up excessive spacing while preserving intentional formatting
    formatted = formatted.replace(/[ \t]{2,}/g, ' ');
    formatted = formatted.replace(/\n{3,}/g, '\n\n');
    
    // Improve bullet point formatting - standardize markers
    formatted = formatted.replace(/^\s*[-•*]\s+/gm, '• ');
    formatted = formatted.replace(/^\s*(\d+)[.)]\s+/gm, '$1. ');
    
    // Clean up common AI text artifacts
    formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '$1'); // Remove bold markers but keep text
    formatted = formatted.replace(/\*([^*]+)\*/g, '$1'); // Remove italic markers
    formatted = formatted.replace(/`([^`]+)`/g, '$1'); // Remove code markers
    
    // Remove trailing spaces on lines
    formatted = formatted.replace(/[ \t]+$/gm, '');
    
    // Clean up double spaces
    formatted = formatted.replace(/  +/g, ' ');
    
    return formatted.trim();
  }

  /**
   * Format professional summary by removing quotes and extra formatting
   * @param {string} summary - Raw summary text
   * @returns {string} - Clean summary
   */
  static formatProfessionalSummary(summary) {
    if (!summary) return '';

    let formatted = summary;
    
    // Remove quotes
    formatted = formatted.replace(/^["']|["']$/g, '');
    
    // Remove markdown formatting
    formatted = this.formatAnalysisText(formatted);
    
    // Remove any instructions or meta text
    formatted = formatted.replace(/^(Write only the professional summary|The summary should).*$/gim, '');
    
    // Clean up and trim
    formatted = formatted.trim();

    return formatted;
  }

  /**
   * Extract numeric rating from text
   * @param {string} text - Text containing a rating
   * @returns {number} - Extracted rating or 0
   */
  static extractRating(text) {
    const match = text.match(/(\d+(?:\.\d+)?)\s*\/\s*10/);
    return match ? parseFloat(match[1]) : 0;
  }

  /**
   * Format job titles list for better display
   * @param {string} jobTitles - Raw job titles text
   * @returns {string[]} - Array of job titles
   */
  static formatJobTitles(jobTitles) {
    if (!jobTitles) return [];

    const lines = jobTitles.split('\n');
    const titles = [];

    lines.forEach(line => {
      const trimmed = line.trim();
      
      // Detect section headers
      if (trimmed.match(/^(CURRENT|GROWTH|DIFFERENT|EMERGING)/i)) {
        // Skip header lines
        return;
      }
      
      // Skip empty lines and bracketed instructions
      if (!trimmed || trimmed.includes('[') || trimmed.includes(']') || trimmed.includes('List')) {
        return;
      }
      
      // Look for job titles (usually start with numbers, bullets, or are standalone)
      // Remove leading numbers, bullets, etc.
      const cleaned = trimmed
        .replace(/^[0-9]+\.\s*/, '')
        .replace(/^[-•*]\s*/, '')
        .replace(/^[:−]\s*/, '')
        .trim();
      
      // Only add if it's a reasonable job title length and doesn't contain meta text
      if (cleaned.length > 3 && cleaned.length < 100 && 
          !cleaned.match(/^(positions?|roles?|jobs?)$/i) &&
          !cleaned.includes('etc') && !cleaned.includes('...')) {
        titles.push(cleaned);
      }
    });

    return titles;
  }

  /**
   * Smart text chunking for better readability
   * @param {string} text - Long text to chunk
   * @param {number} maxLength - Maximum length per chunk
   * @returns {string[]} - Array of text chunks
   */
  static smartTextChunking(text, maxLength = 200) {
    if (!text || text.length <= maxLength) return [text];

    const chunks = [];
    const sentences = text.split(/(?<=[.!?])\s+/);
    let currentChunk = '';

    sentences.forEach(sentence => {
      const potentialChunk = currentChunk + (currentChunk ? ' ' : '') + sentence;
      
      if (potentialChunk.length <= maxLength) {
        currentChunk = potentialChunk;
      } else {
        if (currentChunk) {
          chunks.push(currentChunk.trim());
          currentChunk = sentence;
        } else {
          // Single sentence is too long, break at logical points
          const parts = sentence.split(/,\s+(?:and|or|but|however|therefore|furthermore|moreover|additionally|specifically|particularly)\s+/i);
          if (parts.length > 1) {
            parts.forEach((part, idx) => {
              if (part.trim()) {
                if (idx === 0) {
                  currentChunk = part.trim();
                } else {
                  chunks.push(currentChunk.trim());
                  currentChunk = part.trim();
                }
              }
            });
          } else {
            // Break at commas if no logical conjunctions
            const commaParts = sentence.split(/,\s+/);
            if (commaParts.length > 1) {
              commaParts.forEach((part, idx) => {
                if (part.trim()) {
                  if (idx === 0) {
                    currentChunk = part.trim();
                  } else {
                    chunks.push(currentChunk.trim());
                    currentChunk = part.trim();
                  }
                }
              });
            } else {
              // Last resort: force break at word boundaries
              const words = sentence.split(/\s+/);
              let tempChunk = '';
              words.forEach(word => {
                if ((tempChunk + ' ' + word).length <= maxLength) {
                  tempChunk += (tempChunk ? ' ' : '') + word;
                } else {
                  if (tempChunk) chunks.push(tempChunk.trim());
                  tempChunk = word;
                }
              });
              currentChunk = tempChunk;
            }
          }
        }
      }
    });

    if (currentChunk) {
      chunks.push(currentChunk.trim());
    }

    return chunks.filter(chunk => chunk.length > 0);
  }

  /**
   * Enhanced resume rating formatter with visual components
   * @param {Object} rating - Rating object from analysis
   * @returns {Object} - Enhanced rating with visual data
   */
  static enhanceResumeRating(rating) {
    if (!rating) return null;

    const enhanced = { ...rating };

    // Calculate percentage scores
    enhanced.percentages = {
      contentQuality: Math.round((rating.contentQuality / 2) * 100),
      structureOrganization: Math.round((rating.structureOrganization / 2) * 100),
      formattingDesign: Math.round((rating.formattingDesign / 2) * 100),
      impactLanguage: Math.round((rating.impactLanguage / 2) * 100),
      atsCompatibility: Math.round((rating.atsCompatibility / 2) * 100),
      overall: Math.round((rating.totalScore / 10) * 100)
    };

    // Enhanced grade with color coding
    enhanced.gradeInfo = this.getGradeInfo(rating.totalScore);

    // Categorize improvements by priority
    enhanced.categorizedImprovements = this.categorizeImprovements(rating.improvements || []);

    // Add scoring insights
    enhanced.insights = this.generateRatingInsights(rating);

    // Performance indicators
    enhanced.performance = {
      strengths: this.identifyRatingStrengths(rating),
      weaknesses: this.identifyRatingWeaknesses(rating),
      nextSteps: this.suggestNextSteps(rating)
    };

    return enhanced;
  }

  /**
   * Get grade information with color and description
   * @param {number} totalScore - Total score out of 10
   * @returns {Object} - Grade information object
   */
  static getGradeInfo(totalScore) {
    if (totalScore >= 9) {
      return {
        letter: 'A+',
        label: 'Excellent',
        description: 'Job-ready with competitive advantage',
        color: 'emerald',
        bgColor: 'bg-emerald-50',
        textColor: 'text-emerald-800',
        borderColor: 'border-emerald-200'
      };
    } else if (totalScore >= 7) {
      return {
        letter: 'B+',
        label: 'Good',
        description: 'Strong foundation, minor polish needed',
        color: 'blue',
        bgColor: 'bg-blue-50',
        textColor: 'text-blue-800',
        borderColor: 'border-blue-200'
      };
    } else if (totalScore >= 5) {
      return {
        letter: 'C',
        label: 'Average',
        description: 'Needs improvement in several areas',
        color: 'yellow',
        bgColor: 'bg-yellow-50',
        textColor: 'text-yellow-800',
        borderColor: 'border-yellow-200'
      };
    } else if (totalScore >= 3) {
      return {
        letter: 'D',
        label: 'Weak',
        description: 'Requires major fixes and improvements',
        color: 'orange',
        bgColor: 'bg-orange-50',
        textColor: 'text-orange-800',
        borderColor: 'border-orange-200'
      };
    } else {
      return {
        letter: 'F',
        label: 'Poor',
        description: 'Needs complete rewrite',
        color: 'red',
        bgColor: 'bg-red-50',
        textColor: 'text-red-800',
        borderColor: 'border-red-200'
      };
    }
  }

  /**
   * Categorize improvements by type and priority
   * @param {Array} improvements - Array of improvement suggestions
   * @returns {Object} - Categorized improvements
   */
  static categorizeImprovements(improvements) {
    const categories = {
      critical: [],
      important: [],
      minor: []
    };

    improvements.forEach(improvement => {
      const text = improvement.toLowerCase();
      
      if (text.includes('missing') || text.includes('lacks') || text.includes('no quantifiable') || text.includes('weak')) {
        categories.critical.push(improvement);
      } else if (text.includes('improve') || text.includes('enhance') || text.includes('better') || text.includes('add')) {
        categories.important.push(improvement);
      } else {
        categories.minor.push(improvement);
      }
    });

    return categories;
  }

  /**
   * Generate insights based on rating scores
   * @param {Object} rating - Rating object
   * @returns {Array} - Array of insights
   */
  static generateRatingInsights(rating) {
    const insights = [];
    
    // Content quality insights
    if (rating.contentQuality >= 2) {
      insights.push({ type: 'positive', text: 'Strong content with measurable achievements' });
    } else if (rating.contentQuality === 1) {
      insights.push({ type: 'warning', text: 'Content needs more quantified results' });
    } else {
      insights.push({ type: 'critical', text: 'Content lacks impact and specificity' });
    }

    // ATS compatibility insights
    if (rating.atsCompatibility >= 2) {
      insights.push({ type: 'positive', text: 'Excellent ATS compatibility' });
    } else if (rating.atsCompatibility === 1) {
      insights.push({ type: 'warning', text: 'Minor ATS optimization needed' });
    } else {
      insights.push({ type: 'critical', text: 'High risk of ATS rejection' });
    }

    // Overall performance insight
    if (rating.totalScore >= 8) {
      insights.push({ type: 'success', text: 'Resume is market-ready and competitive' });
    } else if (rating.totalScore >= 6) {
      insights.push({ type: 'info', text: 'Good foundation, focus on weak areas' });
    } else {
      insights.push({ type: 'warning', text: 'Significant improvements needed before job applications' });
    }

    return insights;
  }

  /**
   * Identify rating strengths
   * @param {Object} rating - Rating object
   * @returns {Array} - Array of strengths
   */
  static identifyRatingStrengths(rating) {
    const strengths = [];
    const categories = [
      { key: 'contentQuality', name: 'Content Quality' },
      { key: 'structureOrganization', name: 'Structure & Organization' },
      { key: 'formattingDesign', name: 'Formatting & Design' },
      { key: 'impactLanguage', name: 'Impact & Language' },
      { key: 'atsCompatibility', name: 'ATS Compatibility' }
    ];

    categories.forEach(category => {
      if (rating[category.key] >= 2) {
        strengths.push(category.name);
      }
    });

    return strengths;
  }

  /**
   * Identify rating weaknesses
   * @param {Object} rating - Rating object
   * @returns {Array} - Array of weaknesses
   */
  static identifyRatingWeaknesses(rating) {
    const weaknesses = [];
    const categories = [
      { key: 'contentQuality', name: 'Content Quality' },
      { key: 'structureOrganization', name: 'Structure & Organization' },
      { key: 'formattingDesign', name: 'Formatting & Design' },
      { key: 'impactLanguage', name: 'Impact & Language' },
      { key: 'atsCompatibility', name: 'ATS Compatibility' }
    ];

    categories.forEach(category => {
      if (rating[category.key] <= 1) {
        weaknesses.push({
          area: category.name,
          score: rating[category.key],
          priority: rating[category.key] === 0 ? 'critical' : 'important'
        });
      }
    });

    return weaknesses.sort((a, b) => a.score - b.score);
  }

  /**
   * Suggest next steps based on rating
   * @param {Object} rating - Rating object
   * @returns {Array} - Array of next steps
   */
  static suggestNextSteps(rating) {
    const steps = [];
    
    if (rating.contentQuality <= 1) {
      steps.push('Add quantifiable achievements and specific results to your experience');
    }
    
    if (rating.impactLanguage <= 1) {
      steps.push('Replace passive language with strong action verbs');
    }
    
    if (rating.atsCompatibility <= 1) {
      steps.push('Optimize with industry-specific keywords and improve formatting');
    }
    
    if (rating.structureOrganization <= 1) {
      steps.push('Reorganize content with clear sections and logical flow');
    }
    
    if (rating.formattingDesign <= 1) {
      steps.push('Improve visual presentation and ensure consistent formatting');
    }

    if (steps.length === 0) {
      steps.push('Focus on minor polish and tailoring for specific job applications');
    }

    return steps;
  }

  /**
   * Format complete analysis results for better presentation
   * @param {Object} analysis - Complete analysis object
   * @returns {Object} - Formatted analysis object
   */
  static formatCompleteAnalysis(analysis) {
    if (!analysis) return analysis;

    const formatted = { ...analysis };

    // Format each section of the analysis with enhanced cleaning
    if (formatted.summary) {
      formatted.summary = this.standardizeAnalysisText(formatted.summary);
      formatted.summaryStructured = this.parseStructuredContent(formatted.summary);
    }

    if (formatted.strengths) {
      formatted.strengths = this.standardizeAnalysisText(formatted.strengths);
      formatted.strengthsStructured = this.parseStructuredContent(formatted.strengths);
    }

    if (formatted.weaknesses) {
      formatted.weaknesses = this.standardizeAnalysisText(formatted.weaknesses);
      formatted.weaknessesStructured = this.parseStructuredContent(formatted.weaknesses);
    }

    if (formatted.jobTitles) {
      formatted.jobTitles = this.standardizeAnalysisText(formatted.jobTitles);
      formatted.jobRecommendations = this.formatJobRecommendations(formatted.jobTitles);
    }

    if (formatted.professionalSummary) {
      formatted.professionalSummary = this.formatProfessionalSummary(formatted.professionalSummary);
    }

    // Enhanced rating formatting
    if (formatted.rating) {
      formatted.ratingEnhanced = this.enhanceResumeRating(formatted.rating);
      
      // Clean up any text in the rating breakdown
      if (formatted.rating.breakdown) {
        formatted.rating.breakdown = this.standardizeAnalysisText(formatted.rating.breakdown);
      }
    }

    return formatted;
  }

  /**
   * Dynamically filter out unwanted or irrelevant content from AI responses
   * @param {string} text - Raw AI-generated text
   * @param {Object} options - Filtering options
   * @returns {string} - Text with unwanted content removed
   */
  static filterUnwantedContent(text, options = {}) {
    if (!text) return '';

    let filtered = text;

    // Dynamic patterns to identify and remove irrelevant content
    const dynamicPatterns = [
      // Remove isolated project titles that appear without context
      /^"?[A-Z\s]{3,}(?:FOR|TO|OF|WITH|IN|USING|BY)\s+[A-Z\s]{3,}"?\s*$/gmi,
      
      // Remove incomplete project descriptions (less than 10 words, mostly caps)
      /^"?(?:[A-Z]+\s*){2,}(?:Developed?|Created?|Built?|Designed?)\s+[a-z\s]{5,50}\s*"?\s*$/gmi,
      
      // Remove fragments with broken spacing (like "m od el")
      /\b[a-zA-Z]+(?:\s+[a-zA-Z]){1,3}\s+[a-zA-Z]+\b/g,
      
      // Remove standalone technical terms without context
      /^\s*(?:LLM\d*|API|SDK|ML|AI|NLP|SQL)\s*[a-z\s]{0,10}\s*$/gmi,
      
      // Remove generic project prefixes without meaningful content
      /^"?(?:Developed?|Created?|Built?|Designed?)\s+(?:a|an|the)?\s+[^.]{5,30}\s*"?\s*$/gmi,
      
      // Remove analysis commentary that refers to single statements
      /.*(?:This single|powerful statement|reveals a candidate).*$/gmi,
      /.*(?:Here's a structured breakdown|structured analysis).*$/gmi,
      /.*(?:demonstrates hands-on experience with).*$/gmi,
      
      // Remove incomplete quotes or fragments
      /^"[^"]{5,50}"\s*$/gm,
      
      // Remove lines that are mostly technical acronyms
      /^\s*(?:[A-Z]{2,}\s*){2,}[a-z\s]{0,20}\s*$/gmi
    ];

    // Apply dynamic filtering
    dynamicPatterns.forEach(pattern => {
      filtered = filtered.replace(pattern, '');
    });

    // Remove short lines that don't add value (less than 15 characters, not bullet points)
    const lines = filtered.split('\n');
    const meaningfulLines = lines.filter(line => {
      const trimmed = line.trim();
      if (!trimmed) return false;
      if (trimmed.length < 15 && !trimmed.match(/^[-•*]\s+/)) return false;
      if (trimmed.match(/^[A-Z\s]{3,}$/)) return false; // All caps headers without content
      return true;
    });

    filtered = meaningfulLines.join('\n');

    // Clean up any resulting empty lines or excessive whitespace
    filtered = filtered.replace(/^\s*$/gm, ''); // Remove empty lines
    filtered = filtered.replace(/\n{3,}/g, '\n\n'); // Limit consecutive line breaks
    filtered = filtered.trim();

    return filtered;
  }

  /**
   * Format job recommendations with proper structure
   * @param {string} jobTitles - Raw job titles text
   * @returns {Object} - Structured job recommendations
   */
  static formatJobRecommendations(jobTitles) {
    if (!jobTitles) return { categories: [], total: 0 };

    const lines = jobTitles.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    const categories = [];
    let currentCategory = null;

    lines.forEach(line => {
      // Detect category headers
      const isCategoryHeader = (
        line.match(/^(?:CURRENT LEVEL|GROWTH|ADVANCEMENT|DIFFERENT INDUSTRIES|EMERGING ROLES|SIMILAR ROLES|SENIOR POSITIONS|ALTERNATIVE CAREERS)/i) ||
        line.match(/^[A-Z\s]{10,}(?:POSITIONS?|OPPORTUNITIES|ROLES?):/i) ||
        line.match(/^[A-Z\s&\-']{8,}:$/i)
      );

      if (isCategoryHeader) {
        // Start new category
        currentCategory = {
          name: line.replace(/^[0-9]+\.\s*/, '').replace(/:$/, '').trim(),
          jobs: [],
          description: ''
        };
        categories.push(currentCategory);
      } else if (currentCategory) {
        // Check if it's a job title or description
        const isJobTitle = (
          line.match(/^[-•*]\s*/) ||
          line.match(/^\d+\.\s*/) ||
          (!line.includes('where') && !line.includes('because') && line.length < 100)
        );

        if (isJobTitle) {
          // Clean and add job title
          const cleanTitle = line
            .replace(/^[-•*]\s*/, '')
            .replace(/^\d+\.\s*/, '')
            .trim();

          if (cleanTitle.length > 3 && cleanTitle.length < 80) {
            currentCategory.jobs.push(cleanTitle);
          }
        } else {
          // Add to category description
          if (line.length > 10 && !currentCategory.description) {
            currentCategory.description = line;
          }
        }
      }
    });

    // Clean up categories with no jobs
    const validCategories = categories.filter(cat => cat.jobs.length > 0);
    
    // Calculate total job count
    const totalJobs = validCategories.reduce((sum, cat) => sum + cat.jobs.length, 0);

    return {
      categories: validCategories,
      total: totalJobs,
      formatted: this.formatJobCategoriesForDisplay(validCategories)
    };
  }

  /**
   * Format job categories for clean display
   * @param {Array} categories - Job categories array
   * @returns {string} - Formatted display string
   */
  static formatJobCategoriesForDisplay(categories) {
    if (!categories || categories.length === 0) return '';

    let formatted = '';

    categories.forEach((category, index) => {
      if (index > 0) formatted += '\n\n';
      
      // Category header
      formatted += `${category.name}\n`;
      
      // Category description if available
      if (category.description) {
        formatted += `${category.description}\n\n`;
      }

      // Job titles as bullet points
      category.jobs.forEach(job => {
        formatted += `• ${job}\n`;
      });
    });

    return formatted.trim();
  }

  /**
   * Clean and standardize AI-generated text for consistent formatting
   * @param {string} text - Raw AI-generated text
   * @returns {string} - Cleaned and standardized text
   */
  static standardizeAnalysisText(text) {
    if (!text) return '';

    // First filter out unwanted content
    let standardized = this.filterUnwantedContent(text);

    // Normalize line endings
    standardized = standardized.replace(/\r\n/g, '\n');
    
    // Remove excessive whitespace
    standardized = standardized.replace(/[ \t]+/g, ' ');
    standardized = standardized.replace(/\n{3,}/g, '\n\n');
    
    // Standardize bullet points
    standardized = standardized.replace(/^\s*[-•*]\s+/gm, '• ');
    standardized = standardized.replace(/^\s*(\d+)[.)]\s+/gm, '$1. ');
    
    // Clean up AI artifacts
    standardized = standardized.replace(/\*\*([^*]+)\*\*/g, '$1'); // Remove bold
    standardized = standardized.replace(/\*([^*]+)\*/g, '$1'); // Remove italic
    standardized = standardized.replace(/`([^`]+)`/g, '$1'); // Remove code
    
    // Remove trailing spaces
    standardized = standardized.replace(/[ \t]+$/gm, '');
    
    // Ensure proper spacing around punctuation
    standardized = standardized.replace(/([.!?])\s*([A-Z])/g, '$1 $2');
    
    return standardized.trim();
  }

  /**
   * Improve text readability with better paragraph breaks
   * @param {string} text - Raw text
   * @returns {string} - Text with improved paragraph structure
   */
  static improveReadability(text) {
    if (!text) return '';

    let improved = text;

    // Add paragraph breaks before key transition words
    const transitionWords = [
      'However', 'Furthermore', 'Additionally', 'Moreover', 'Nevertheless',
      'On the other hand', 'In contrast', 'Similarly', 'For example', 'In summary',
      'Therefore', 'Consequently', 'As a result', 'For instance'
    ];

    transitionWords.forEach(word => {
      const regex = new RegExp(`(\\.)\\s+(${word})`, 'gi');
      improved = improved.replace(regex, '$1\n\n$2');
    });

    // Improve list formatting - only add line breaks where appropriate
    // This regex was too aggressive, let's be more specific
    improved = improved.replace(/([.!?])\s*([-•*])\s*([A-Z])/g, '$1\n$2 $3');

    // Clean up excessive whitespace
    improved = improved.replace(/\n{3,}/g, '\n\n');
    improved = improved.replace(/\s+$/gm, ''); // Remove trailing spaces

    return improved.trim();
  }
}