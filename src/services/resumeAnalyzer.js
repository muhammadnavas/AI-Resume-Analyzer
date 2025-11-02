import { GoogleGenerativeAI } from '@google/generative-ai';
import { RealJobSearchService } from './realJobSearchService.js';
import { VectorService } from './vectorService.js';

export class ResumeAnalyzer {
  constructor(apiKey) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    // Use the free Gemini Flash model with optimized settings
    this.model = this.genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2048,
      }
    });
    this.vectorService = new VectorService();
    this.realJobSearch = new RealJobSearchService();
  }

  /**
   * Helper method to handle Gemini API calls with consistent error handling
   * @param {string} prompt - The prompt to send to Gemini
   * @param {string} operation - The operation name for error messages
   * @returns {Promise<string>} - The generated response
   */
  async callGeminiAPI(prompt, operation) {
    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error(`Error in ${operation}:`, error);
      
      // Handle specific API errors for free tier
      if (error.message.includes('quota') || error.message.includes('rate limit')) {
        throw new Error('Gemini API quota exceeded. Please try again later or check your usage limits.');
      } else if (error.message.includes('404') || error.message.includes('not found')) {
        throw new Error('Gemini Flash model not accessible. Please verify your API key has access to gemini-2.5-flash.');
      } else if (error.message.includes('403') || error.message.includes('forbidden')) {
        throw new Error('API access forbidden. Please check your API key permissions.');
      } else if (error.message.includes('429')) {
        throw new Error('Too many requests. Please wait a moment before trying again.');
      }
      
      throw new Error(`${operation} failed: ${error.message}`);
    }
  }

  /**
   * Generate resume summary with vector search
   * @param {string} text - Full resume text
   * @returns {Promise<string>} - Generated summary
   */
  async generateSummary(text) {
    // Create chunks and add to vector store
    const chunks = VectorService.createTextChunks(text, 700, 200);
    this.vectorService.addDocuments(chunks);
    
    // Use vector search to find most relevant chunks for summary
    const relevantChunks = this.vectorService.similaritySearch(
      "professional experience education skills summary", 5
    );
    
    const prompt = this.createSummaryPrompt(relevantChunks.map(doc => doc.pageContent));
    
    return await this.callGeminiAPI(prompt, 'Resume summary generation');
  }

  /**
   * Analyze resume strengths with vector search
   * @param {string} text - Full resume text
   * @returns {Promise<string>} - Strengths analysis
   */
  async analyzeStrengths(text) {
    // Find strength-related content
    const relevantChunks = this.vectorService.similaritySearch(
      "achievements accomplishments skills expertise experience strengths", 5
    );
    
    const prompt = this.createStrengthsPrompt(relevantChunks.map(doc => doc.pageContent));
    
    return await this.callGeminiAPI(prompt, 'Resume strengths analysis');
  }

  /**
   * Analyze resume weaknesses and provide improvement suggestions
   * @param {Array} chunks - Text chunks from resume
   * @returns {Promise<string>} - Weaknesses analysis and suggestions
   */
  async analyzeWeaknesses(chunks) {
    const prompt = this.createWeaknessesPrompt(chunks);
    
    return await this.callGeminiAPI(prompt, 'Resume weaknesses analysis');
  }

  /**
   * Suggest suitable job titles based on resume content
   * @param {Array} chunks - Text chunks from resume
   * @returns {Promise<string>} - Job title suggestions
   */
  async suggestJobTitles(chunks) {
    const prompt = this.createJobTitlesPrompt(chunks);
    
    return await this.callGeminiAPI(prompt, 'Job titles suggestion');
  }

  /**
   * Generate a professional summary for the resume
   * @param {Array} chunks - Text chunks from resume
   * @returns {Promise<string>} - Professional summary
   */
  async generateProfessionalSummary(chunks) {
    const prompt = this.createProfessionalSummaryPrompt(chunks);
    
    return await this.callGeminiAPI(prompt, 'Professional summary generation');
  }

  /**
   * Rate the resume on various criteria
   * @param {Array} chunks - Text chunks from resume
   * @returns {Promise<Object>} - Resume rating and breakdown
   */
  async rateResume(chunks) {
    const prompt = this.createRatingPrompt(chunks);
    
    const response = await this.callGeminiAPI(prompt, 'Resume rating');
    return this.parseRatingResponse(response);
  }

  /**
   * Compare resume against a specific job title
   * @param {Array} chunks - Text chunks from resume
   * @param {string} jobTitle - Target job title
   * @returns {Promise<string>} - Comparison analysis
   */
  async compareWithJobTitle(chunks, jobTitle) {
    const prompt = this.createJobComparisonPrompt(chunks, jobTitle);
    
    return await this.callGeminiAPI(prompt, 'Job title comparison');
  }

  // Prompt creation methods optimized for Gemini
  createSummaryPrompt(chunks) {
    return `You are an expert resume analyst. Please provide a detailed summarization of the following resume content in a structured, point-based format:

RESUME CONTENT:
${chunks.join('\n\n')}

Please provide a comprehensive summary with clear sections and bullet points:

1. PROFESSIONAL BACKGROUND AND EXPERIENCE LEVEL
- Write 2-3 specific bullet points about their experience level and background
- Include years of experience if mentioned
- Highlight their main professional focus

2. KEY SKILLS AND TECHNICAL COMPETENCIES  
- List specific technical skills mentioned
- Include programming languages, frameworks, tools
- Mention any certifications or specialized knowledge

3. NOTABLE ACHIEVEMENTS AND ACCOMPLISHMENTS
- Highlight specific projects or achievements
- Include any quantifiable results or metrics
- Mention awards, recognition, or standout work

4. EDUCATION AND CERTIFICATIONS
- Educational background and degrees
- Relevant certifications or training
- Academic achievements or projects

5. OVERALL CAREER TRAJECTORY AND FOCUS AREAS
- Career direction and goals
- Areas of specialization or interest
- Growth potential and future opportunities

Use clear, concise bullet points. Each point should be specific and informative. Avoid generic statements.`;
  }

  createStrengthsPrompt(chunks) {
    return `You are an expert career counselor. Please analyze the following resume content and identify key strengths in a structured format:

RESUME CONTENT:
${chunks.join('\n\n')}

Analyze and explain the candidate's key strengths with specific bullet points:

1. TECHNICAL SKILLS AND EXPERTISE
- List specific technical strengths with examples
- Mention programming languages, frameworks, tools they excel in
- Highlight any advanced or specialized technical knowledge

2. PROFESSIONAL EXPERIENCE HIGHLIGHTS
- Key achievements in their work experience
- Specific projects or roles that demonstrate competency
- Leadership or team collaboration examples

3. LEADERSHIP AND SOFT SKILLS
- Communication, teamwork, or leadership abilities shown
- Problem-solving examples from their experience
- Any management or mentoring experience

4. EDUCATIONAL QUALIFICATIONS
- Relevant degrees, certifications, or training
- Academic projects or achievements
- Continuous learning or professional development

5. UNIQUE VALUE PROPOSITIONS
- What makes this candidate stand out
- Unique combination of skills or experience
- Special accomplishments or recognition

6. INDUSTRY KNOWLEDGE AND DOMAIN EXPERTISE
- Specific industry knowledge or experience
- Domain expertise in particular areas
- Understanding of industry trends or technologies

Provide specific examples from the resume to support each strength identified. Use clear bullet points for easy reading.`;
  }

  createWeaknessesPrompt(chunks) {
    return `You are an expert resume reviewer. Please analyze the following resume content and identify areas for improvement with specific, actionable suggestions:

RESUME CONTENT:
${chunks.join('\n\n')}

Analyze potential weaknesses and provide constructive improvement suggestions with clear bullet points:

1. MISSING SKILLS OR QUALIFICATIONS FOR TARGET ROLES
- Identify specific technical skills that could be added
- Suggest relevant certifications or training
- Highlight gaps in required qualifications for their field

2. GAPS IN EXPERIENCE OR CAREER PROGRESSION
- Point out any unexplained employment gaps
- Suggest ways to address career progression concerns
- Recommend experience-building opportunities

3. PRESENTATION AND FORMATTING ISSUES
- Identify specific formatting or structure problems
- Suggest improvements to layout and organization
- Recommend better ways to present information

4. MISSING ACHIEVEMENTS OR QUANTIFIABLE RESULTS
- Point out lack of specific metrics or numbers
- Suggest how to quantify their accomplishments
- Recommend adding measurable impact statements

5. AREAS WHERE ADDITIONAL CERTIFICATIONS MIGHT HELP
- Suggest specific certifications for their field
- Recommend training programs or courses
- Identify skill gaps that certifications could fill

6. WAYS TO BETTER HIGHLIGHT EXISTING STRENGTHS
- Suggest better positioning of current skills
- Recommend rewriting weak sections
- Advise on emphasizing valuable experience

Focus on actionable advice with specific recommendations. Use clear bullet points for each suggestion.`;
  }

  createJobTitlesPrompt(chunks) {
    return `You are an expert career advisor. Based on the following resume content, suggest suitable job titles and roles:

RESUME CONTENT:
${chunks.join('\n\n')}

Suggest 8-10 specific job titles that align with this candidate's background, organized by category:

CURRENT LEVEL POSITIONS (matching experience):
[List 3-4 positions]

GROWTH/ADVANCEMENT OPPORTUNITIES:
[List 2-3 positions]

DIFFERENT INDUSTRIES WHERE SKILLS COULD TRANSFER:
[List 2-3 positions]

EMERGING ROLES IN RELEVANT FIELDS:
[List 1-2 positions]

For each suggestion, briefly explain why it's a good fit based on the candidate's background. Use clear section headings without markdown formatting (no ** or # symbols). Write in a natural, flowing manner.`;
  }

  createProfessionalSummaryPrompt(chunks) {
    return `Create a compelling 2-3 sentence professional summary for the top of a resume based on this content:

RESUME CONTENT:
${chunks.join('\n\n')}

The summary should:
1. Highlight the most impressive qualifications
2. Mention years of experience and key areas of expertise
3. Include 2-3 most relevant skills or achievements
4. Be written in a professional, confident tone
5. Be concise but impactful (2-3 sentences maximum)

Write only the professional summary, no additional commentary.`;
  }

  createRatingPrompt(chunks) {
    return `Rate this resume using professional recruiter standards on a 10-point scale across these critical areas:

RESUME CONTENT:
${chunks.join('\n\n')}

Rate each category (0-2 points each, total 10 points):

1. CONTENT QUALITY (0-2 points):
   - 2: Strong, relevant, quantified achievements with measurable results
   - 1: Some achievements present but mixed with generic duties
   - 0: Weak, vague, irrelevant details without impact metrics

2. STRUCTURE & ORGANIZATION (0-2 points):
   - 2: Clear logical flow (Summary → Skills → Experience → Education), easy to scan
   - 1: Somewhat organized but confusing sections or poor flow
   - 0: Poor structure, hard to read, illogical organization

3. FORMATTING & DESIGN (0-2 points):
   - 2: Clean, consistent, professional formatting with proper spacing
   - 1: Minor issues with spacing, alignment, or consistency
   - 0: Messy, inconsistent formatting, distracting elements

4. IMPACT & LANGUAGE (0-2 points):
   - 2: Strong action verbs, quantified results, compelling summary
   - 1: Mixed language; some power verbs but also generic phrases
   - 0: Passive language, weak wording, no measurable impact

5. ATS COMPATIBILITY (0-2 points):
   - 2: ATS-friendly format, keyword optimized, industry-specific terms
   - 1: Minor ATS risks (some formatting issues, missing some keywords)
   - 0: Likely ATS rejection (poor keyword usage, complex formatting)

EVALUATION CRITERIA:
- Look for quantified achievements (percentages, numbers, metrics)
- Check for action verbs (Built, Optimized, Led, Achieved vs "Responsible for")
- Assess keyword usage for industry relevance
- Evaluate readability and professional presentation
- Consider ATS parsing compatibility

Format your response as:
Content Quality: X/2 - [Specific feedback on achievements vs duties, relevance, keywords]
Structure & Organization: X/2 - [Feedback on flow, clarity, section order]
Formatting & Design: X/2 - [Assessment of visual presentation and consistency]
Impact & Language: X/2 - [Evaluation of action verbs, quantification, summary strength]
ATS Compatibility: X/2 - [Analysis of keyword usage and format compatibility]

TOTAL SCORE: X/10

GRADE INTERPRETATION:
- 9-10: Excellent (job-ready, strong competitive advantage)
- 7-8: Good (minor polish needed, solid foundation)
- 5-6: Average (needs improvement, several areas to address)
- 3-4: Weak (requires major fixes, significant gaps)
- 0-2: Poor (needs complete rewrite, not usable as is)

SPECIFIC IMPROVEMENT RECOMMENDATIONS:
[Provide 3-5 actionable suggestions for the lowest-scoring areas]`;
  }

  createJobComparisonPrompt(chunks, jobTitle) {
    return `Compare this resume against the requirements for a "${jobTitle}" position:

RESUME CONTENT:
${chunks.join('\n\n')}

Analyze:
1. Skills Match: Which required skills does the candidate have/lack?
2. Experience Relevance: How well does their experience align?
3. Gap Analysis: What skills or experience are missing?
4. Strengths for this Role: What makes them a strong candidate?
5. Improvement Suggestions: How to better position for this role?
6. Match Percentage: Provide an estimated match percentage (0-100%)

Be specific about technical requirements, years of experience, and industry knowledge.`;
  }

  /**
   * Parse the rating response to extract numerical scores (new 10-point system)
   * @param {string} response - Raw response from Gemini
   * @returns {Object} - Parsed rating data
   */
  parseRatingResponse(response) {
    const ratings = {
      contentQuality: 0,
      structureOrganization: 0,
      formattingDesign: 0,
      impactLanguage: 0,
      atsCompatibility: 0,
      totalScore: 0,
      grade: '',
      improvements: [],
      breakdown: response
    };

    try {
      // Extract individual scores using regex for new format
      const patterns = {
        contentQuality: /Content Quality:\s*(\d+)\/2/i,
        structureOrganization: /Structure & Organization:\s*(\d+)\/2/i,
        formattingDesign: /Formatting & Design:\s*(\d+)\/2/i,
        impactLanguage: /Impact & Language:\s*(\d+)\/2/i,
        atsCompatibility: /ATS Compatibility:\s*(\d+)\/2/i,
        totalScore: /TOTAL SCORE:\s*(\d+)\/10/i
      };

      Object.keys(patterns).forEach(key => {
        const match = response.match(patterns[key]);
        if (match && match[1]) {
          ratings[key] = parseInt(match[1], 10);
        }
      });

      // Calculate total score if not found
      if (ratings.totalScore === 0) {
        ratings.totalScore = ratings.contentQuality + ratings.structureOrganization + 
                           ratings.formattingDesign + ratings.impactLanguage + 
                           ratings.atsCompatibility;
      }

      // Determine grade based on total score
      if (ratings.totalScore >= 9) {
        ratings.grade = 'Excellent (Job-Ready)';
      } else if (ratings.totalScore >= 7) {
        ratings.grade = 'Good (Minor Polish Needed)';
      } else if (ratings.totalScore >= 5) {
        ratings.grade = 'Average (Needs Improvement)';
      } else if (ratings.totalScore >= 3) {
        ratings.grade = 'Weak (Major Fixes Required)';
      } else {
        ratings.grade = 'Poor (Complete Rewrite Needed)';
      }

      // Extract improvement recommendations
      const improvementMatch = response.match(/SPECIFIC IMPROVEMENT RECOMMENDATIONS:\s*([\s\S]*?)(?:\n\n|$)/i);
      if (improvementMatch) {
        const improvementText = improvementMatch[1].trim();
        ratings.improvements = improvementText.split('\n')
          .filter(line => line.trim().length > 0)
          .map(line => line.replace(/^[-•]\s*/, '').trim());
      }

    } catch (error) {
      console.error('Error parsing rating response:', error);
    }

    return ratings;
  }

  /**
   * Search for relevant jobs based on resume content
   * @param {string} resumeText - Full resume text
   * @param {Object} options - Search options
   * @returns {Promise<Object>} - Job search results
   */
  async searchJobs(resumeText, options = {}) {
    try {
      // Extract skills and experience from resume
      const extractedData = this.extractResumeData(resumeText);
      
      console.log('Searching for real jobs with extracted data:', extractedData);
      
      // Use real job search service for actual LinkedIn job fetching
      const realJobResults = await this.realJobSearch.searchJobsAlignedWithResume(
        extractedData, 
        options.maxResults || 5
      );
      
      // Also get LinkedIn search URLs as backup using real job search service
      const searchUrls = this.realJobSearch.generateJobSearchUrls(extractedData);
      
      return {
        ...realJobResults,
        searchUrls: searchUrls,
        extractedData: extractedData
      };
    } catch (error) {
      console.error('Error searching jobs:', error);
      throw new Error(`Failed to search for jobs: ${error.message}`);
    }
  }

  /**
   * Extract structured data from resume text
   * @param {string} resumeText - Full resume text
   * @returns {Object} - Extracted resume data
   */
  extractResumeData(resumeText) {
    const data = {
      skills: [],
      experience: '',
      location: 'United States'
    };

    // Extract skills using patterns
    const skillPatterns = [
      /\b(JavaScript|Python|Java|React|Node\.?js|Angular|Vue\.?js|TypeScript)\b/gi,
      /\b(HTML|CSS|SCSS|SASS|Bootstrap|Tailwind)\b/gi,
      /\b(SQL|MongoDB|PostgreSQL|MySQL|Redis|Firebase)\b/gi,
      /\b(AWS|Azure|Docker|Kubernetes|Git|Jenkins)\b/gi,
      /\b(Machine Learning|AI|Data Science|Analytics|TensorFlow|PyTorch)\b/gi,
      /\b(Express|Django|Flask|Spring|Laravel|Rails)\b/gi,
      /\b(PHP|Ruby|Go|Rust|Swift|Kotlin|C\+\+|C#)\b/gi
    ];

    skillPatterns.forEach(pattern => {
      const matches = resumeText.match(pattern);
      if (matches) {
        data.skills.push(...matches.map(match => match.trim()));
      }
    });

    // Remove duplicates and clean up
    data.skills = [...new Set(data.skills)].slice(0, 10);

    // Extract experience (look for years of experience)
    const experienceMatch = resumeText.match(/(\d+)\+?\s*years?\s*(?:of\s*)?experience/i);
    if (experienceMatch) {
      data.experience = experienceMatch[1];
    }

    // Extract location (look for common location patterns)
    const locationMatch = resumeText.match(/(?:Location|Address|Based in)[:\s]*([^,\n]+(?:,\s*[A-Z]{2})?)/i);
    if (locationMatch) {
      data.location = locationMatch[1].trim();
    }

    return data;
  }

  /**
   * Perform complete resume analysis with job search
   * @param {string} resumeText - Full resume text
   * @param {Object} options - Analysis options
   * @returns {Promise<Object>} - Complete analysis results including job search
   */
  async performCompleteAnalysisWithJobs(resumeText, options = {}) {
    try {
      // Create chunks for analysis
      const chunks = VectorService.createTextChunks(resumeText, 700, 200);
      this.vectorService.addDocuments(chunks);

      // Perform standard analysis
      const [summary, strengths, weaknesses, jobTitles, professionalSummary, rating, jobSearch] = await Promise.all([
        this.generateSummary(resumeText),
        this.analyzeStrengths(resumeText),
        this.analyzeWeaknesses(chunks),
        this.suggestJobTitles(chunks),
        this.generateProfessionalSummary(chunks),
        this.rateResume(chunks),
        this.searchJobs(resumeText, options)
      ]);

      return {
        summary,
        strengths,
        weaknesses,
        jobTitles,
        professionalSummary,
        rating,
        jobSearch,
        analyzedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error performing complete analysis with jobs:', error);
      throw new Error('Failed to complete resume analysis with job search');
    }
  }

  /**
   * Perform complete resume analysis (legacy method for compatibility)
   * @param {Array} chunks - Text chunks from resume
   * @returns {Promise<Object>} - Complete analysis results
   */
  async performCompleteAnalysis(chunks) {
    try {
      console.log('Starting performCompleteAnalysis with', chunks.length, 'chunks');
      
      // Convert chunks to full text for vector service compatibility
      const fullText = chunks.join('\n\n');
      console.log('Full text length:', fullText.length);
      
      // Add documents to vector service
      this.vectorService.addDocuments(chunks.map(chunk => chunk));
      console.log('Added documents to vector service');

      console.log('Starting parallel analysis...');
      const [summary, strengths, weaknesses, jobTitles, professionalSummary, rating] = await Promise.all([
        this.generateSummary(fullText).catch(err => {
          console.error('Summary generation failed:', err);
          throw new Error(`Summary generation failed: ${err.message}`);
        }),
        this.analyzeStrengths(fullText).catch(err => {
          console.error('Strengths analysis failed:', err);
          throw new Error(`Strengths analysis failed: ${err.message}`);
        }),
        this.analyzeWeaknesses(chunks).catch(err => {
          console.error('Weaknesses analysis failed:', err);
          throw new Error(`Weaknesses analysis failed: ${err.message}`);
        }),
        this.suggestJobTitles(chunks).catch(err => {
          console.error('Job titles suggestion failed:', err);
          throw new Error(`Job titles suggestion failed: ${err.message}`);
        }),
        this.generateProfessionalSummary(chunks).catch(err => {
          console.error('Professional summary generation failed:', err);
          throw new Error(`Professional summary generation failed: ${err.message}`);
        }),
        this.rateResume(chunks).catch(err => {
          console.error('Resume rating failed:', err);
          throw new Error(`Resume rating failed: ${err.message}`);
        })
      ]);

      console.log('All analysis components completed successfully');

      return {
        summary,
        strengths,
        weaknesses,
        jobTitles,
        professionalSummary,
        rating,
        analyzedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error performing complete analysis:', error);
      throw new Error(`Failed to complete resume analysis: ${error.message}`);
    }
  }
}