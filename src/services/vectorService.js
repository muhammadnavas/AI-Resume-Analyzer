// Vector Service - Browser-compatible FAISS-like functionality for text similarity search

class VectorService {
  constructor() {
    this.documents = [];
    this.vectors = [];
    this.documentMetadata = [];
    this.vocabulary = new Map();
    this.idfCache = new Map();
  }

  // Simple tokenizer for browser compatibility
  tokenize(text) {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(token => token.length > 2);
  }

  // Calculate term frequency
  calculateTF(tokens) {
    const tf = new Map();
    const totalTokens = tokens.length;
    
    for (const token of tokens) {
      tf.set(token, (tf.get(token) || 0) + 1);
    }
    
    // Normalize by total tokens
    for (const [token, count] of tf.entries()) {
      tf.set(token, count / totalTokens);
    }
    
    return tf;
  }

  // Calculate inverse document frequency
  calculateIDF(term) {
    if (this.idfCache.has(term)) {
      return this.idfCache.get(term);
    }
    
    let docCount = 0;
    for (const doc of this.documents) {
      if (doc.toLowerCase().includes(term)) {
        docCount++;
      }
    }
    
    const idf = Math.log(this.documents.length / (docCount + 1));
    this.idfCache.set(term, idf);
    return idf;
  }

  // Build vocabulary from all documents
  buildVocabulary() {
    const vocab = new Set();
    
    for (const doc of this.documents) {
      const tokens = this.tokenize(doc);
      for (const token of tokens) {
        vocab.add(token);
      }
    }
    
    // Convert to Map with indices
    let index = 0;
    for (const term of vocab) {
      this.vocabulary.set(term, index++);
    }
  }

  // Create TF-IDF vector for a document
  createTFIDFVector(text) {
    const tokens = this.tokenize(text);
    const tf = this.calculateTF(tokens);
    const vector = new Array(this.vocabulary.size).fill(0);
    
    for (const [term, tfValue] of tf.entries()) {
      if (this.vocabulary.has(term)) {
        const index = this.vocabulary.get(term);
        const idf = this.calculateIDF(term);
        vector[index] = tfValue * idf;
      }
    }
    
    return vector;
  }

  // Add documents to the vector store (similar to FAISS.from_texts)
  addDocuments(textChunks, metadata = []) {
    this.documents = [...textChunks];
    this.documentMetadata = metadata.length ? metadata : textChunks.map((text, id) => ({ id, text }));
    
    // Build vocabulary and vectors
    this.buildVocabulary();
    this.vectors = this.documents.map(doc => this.createTFIDFVector(doc));
  }

  // Calculate cosine similarity between two vectors
  cosineSimilarity(vecA, vecB) {
    if (vecA.length !== vecB.length) {
      return 0;
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (normA * normB);
  }

  // Similarity search (equivalent to vectorstore.similarity_search)
  similaritySearch(query, k = 3) {
    if (this.vectors.length === 0) {
      return [];
    }

    // Create query vector
    const queryVector = this.createTFIDFVector(query);

    // Calculate similarities
    const similarities = this.vectors.map((docVector, index) => ({
      index,
      similarity: this.cosineSimilarity(queryVector, docVector),
      document: this.documents[index],
      metadata: this.documentMetadata[index]
    }));

    // Sort by similarity and return top k
    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, k)
      .map(result => ({
        pageContent: result.document,
        metadata: result.metadata,
        similarity: result.similarity
      }));
  }

  // Get embedding-like representation for a text
  getTextEmbedding(text) {
    return this.createTFIDFVector(text);
  }

  // Advanced text chunking similar to LangChain's RecursiveCharacterTextSplitter
  static createTextChunks(text, chunkSize = 700, chunkOverlap = 200) {
    const chunks = [];
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    let currentChunk = '';
    
    for (const sentence of sentences) {
      const trimmedSentence = sentence.trim();
      if (!trimmedSentence) continue;
      
      // If adding this sentence exceeds chunk size, save current chunk
      if (currentChunk.length + trimmedSentence.length > chunkSize && currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
        
        // Create overlap by keeping last part of chunk
        const words = currentChunk.split(' ');
        const overlapWords = Math.floor(chunkOverlap / 10); // Approximate overlap
        currentChunk = words.slice(-overlapWords).join(' ') + ' ' + trimmedSentence;
      } else {
        currentChunk += (currentChunk ? '. ' : '') + trimmedSentence;
      }
    }
    
    // Add the last chunk
    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }
    
    return chunks.filter(chunk => chunk.length > 50); // Filter very small chunks
  }

  // Extract key features from resume text
  static extractResumeFeatures(text) {
    const features = {
      skills: [],
      experience: [],
      education: [],
      certifications: [],
      keywords: []
    };

    // Common skill patterns
    const skillPatterns = [
      /\b(JavaScript|Python|Java|React|Node\.js|SQL|HTML|CSS|Git|Docker|AWS|Azure|Machine Learning|AI|Data Science)\b/gi,
      /\b(Programming|Development|Engineering|Analysis|Management|Leadership|Communication)\b/gi
    ];

    // Experience patterns
    const expPatterns = [
      /(\d+)\s*(years?|yrs?)\s*(of\s*)?(experience|exp)/gi,
      /(Senior|Junior|Lead|Principal|Manager|Director|Analyst|Engineer|Developer)/gi
    ];

    // Extract skills
    skillPatterns.forEach(pattern => {
      const matches = text.match(pattern) || [];
      features.skills.push(...matches);
    });

    // Extract experience indicators
    expPatterns.forEach(pattern => {
      const matches = text.match(pattern) || [];
      features.experience.push(...matches);
    });

    // Extract education keywords
    const eduKeywords = text.match(/\b(Bachelor|Master|PhD|Degree|University|College|Graduate|MBA|BS|MS|BSc|MSc)\b/gi) || [];
    features.education = eduKeywords;

    // Extract certification keywords
    const certKeywords = text.match(/\b(Certified|Certification|Certificate|AWS|Microsoft|Google|Oracle|Cisco)\b/gi) || [];
    features.certifications = certKeywords;

    // Extract general keywords using simple frequency analysis
    const words = text.toLowerCase().match(/\b[a-z]{3,}\b/g) || [];
    const wordCount = new Map();
    
    for (const word of words) {
      wordCount.set(word, (wordCount.get(word) || 0) + 1);
    }
    
    // Get top keywords by frequency
    const sortedWords = Array.from(wordCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([word]) => word);
    
    features.keywords = sortedWords;

    return features;
  }
}

export { VectorService };
