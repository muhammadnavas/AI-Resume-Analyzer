# AI Resume Analyzer & Career Optimizer

**Intelligent Resume Analysis with Google Gemini AI**

A modern React-based application that provides comprehensive resume analysis using Google Gemini AI. The application processes PDF and DOCX resumes to deliver detailed insights, scoring, and career recommendations with a beautiful, responsive interface.

<br />

**Table of Contents**

1. [Features](#features)
2. [Technology Stack](#technology-stack)
3. [Installation](#installation)
4. [Usage](#usage)
5. [Project Structure](#project-structure)
6. [API Configuration](#api-configuration)
7. [Contributing](#contributing)
8. [License](#license)

<br />

## **Features**

### 🎯 **Resume Analysis Engine**
- **Multi-format Processing**: Supports PDF and DOCX file uploads
- **Google Gemini Integration**: Advanced AI analysis using Gemini 1.5 Flash
- **Comprehensive Scoring**: 10-point rating system across 5 key criteria:
  - Content Quality & Clarity
  - Structure & Organization  
  - Visual Formatting & Design
  - Achievement Impact & Quantification
  - ATS Compatibility & Optimization

### 📊 **Detailed Insights**
- **Professional Summary Generation**: AI-crafted summaries optimized for ATS
- **Strengths Analysis**: Identifies key advantages with supporting examples
- **Improvement Recommendations**: Actionable feedback for resume enhancement
- **Job Title Suggestions**: Career-appropriate position recommendations
- **Grade Classification**: Professional grading from A+ to F based on overall score

### 💼 **Job Search Integration**
- **Job Scraper Demo**: Mock job search interface with sample data
- **LinkedIn-style Results**: Professional job listing presentation
- **Industry Insights**: Career market information and trends

### 🎨 **Modern User Experience**
- **Responsive Design**: Optimized for desktop, tablet, and mobile devices
- **Drag & Drop Upload**: Intuitive file handling with instant validation
- **Real-time Processing**: Live progress indicators during analysis
- **Tabbed Interface**: Organized results in easily navigable sections
- **Export Functionality**: Download complete analysis as formatted text reports
- **Status Indicators**: Visual feedback for API connectivity and file processing

<br />

## **Technology Stack**

### **Frontend Framework**
- **React 18** - Modern functional components with hooks
- **JavaScript ES6+** - Latest JavaScript features and async/await patterns
- **React Router 6** - Client-side routing and navigation

### **UI & Styling**
- **Tailwind CSS 3** - Utility-first CSS with custom design system
- **Lucide React** - Modern SVG icon library
- **Glassmorphism Effects** - Modern UI with backdrop blur effects
- **Responsive Design** - Mobile-first approach with breakpoint optimization

### **AI & Document Processing**
- **Google Generative AI (@google/generative-ai)** - Gemini 1.5 Flash model integration
- **PDF.js (pdfjs-dist)** - Client-side PDF text extraction
- **Mammoth.js** - Microsoft Word (.docx) document processing
- **Custom Vector Service** - Text similarity search and analysis

### **File Handling & Validation**
- **React Dropzone** - Drag and drop file upload with validation
- **Custom Document Processor** - Unified PDF/DOCX processing pipeline
- **File Type Detection** - Automatic format recognition and validation

### **State Management & Context**
- **React Context API** - Global state for API key management
- **React Hooks** - Modern state management patterns
- **Local Storage** - Secure API key persistence

### **User Experience**
- **React Hot Toast** - Beautiful notification system
- **Progress Indicators** - Real-time feedback during processing
- **Error Handling** - Comprehensive error management and user feedback

<br />

## **Installation**

### **Prerequisites**
- **Node.js** (version 16 or higher)
- **npm** (comes with Node.js)
- **Google Gemini API Key** ([Get from Google AI Studio](https://makersuite.google.com/))

### **Setup Instructions**

1. **Clone the repository:**
```bash
git clone https://github.com/muhammadnavas/AI-Resume-Analyzer.git
cd AI-Resume-Analyzer
```

2. **Install dependencies:**
```bash
npm install
```

3. **Start the development server:**
```bash
npm start
```

4. **Open your browser:**
Navigate to `http://localhost:3000`

<br />

## **Usage**

### **Getting Started**

1. **Launch Application**
   - Run `npm start` and navigate to `http://localhost:3000`
   - The application opens with a modern dashboard interface

2. **Configure Google Gemini API**
   - Navigate to "Resume Analyzer" section
   - Enter your Google Gemini API key when prompted
   - Key is securely stored in browser's local storage

3. **Upload Resume**
   - Use drag & drop or click to browse files
   - Supported formats: PDF and DOCX (max 10MB)
   - Real-time validation with progress indicators

4. **Get AI Analysis**
   - Click "Analyze Resume" to start processing
   - View comprehensive results across multiple tabs:
     - **Summary**: Overall resume evaluation and key insights
     - **Strengths**: Professional advantages and standout features
     - **Improvements**: Specific enhancement recommendations
     - **Job Suggestions**: AI-matched career opportunities
     - **Rating**: Detailed scoring breakdown with grade

5. **Export Results**
   - Download complete analysis as formatted text report
   - Use insights to optimize resume for ATS systems
   - Track improvement progress over multiple analyses

### **Advanced Features**

#### **Professional Rating System**
- **Content Quality (1-10)**: Information relevance, clarity, and professional impact
- **Structure & Organization (1-10)**: Logical flow and section organization
- **Visual Formatting (1-10)**: Design consistency and presentation quality
- **Achievement Impact (1-10)**: Quantified accomplishments and measurable results
- **ATS Compatibility (1-10)**: Keyword optimization and system compatibility

#### **AI-Generated Insights**
- **Professional Summary**: Compelling 2-3 sentence career overview
- **Strength Analysis**: Data-driven identification of competitive advantages
- **Improvement Roadmap**: Prioritized enhancement recommendations
- **Career Positioning**: Strategic advice for job market positioning

<br />

## **API Configuration**

### **Google Gemini Setup**

#### **Method 1: Environment Variables (Recommended)**

1. **Get API Key:**
   - Visit [Google AI Studio](https://ai.google.dev/)
   - Sign in with your Google account
   - Create a new API key for Gemini 1.5 Flash

2. **Configure Environment:**
   - Copy `.env.example` to `.env` in the project root:
   ```bash
   cp .env.example .env
   ```
   - Edit `.env` and add your API key:
   ```env
   REACT_APP_GEMINI_API_KEY=your_actual_api_key_here
   ```
   - Restart the development server:
   ```bash
   npm start
   ```

3. **Security Benefits:**
   - ✅ API key is not stored in browser local storage
   - ✅ Not committed to version control (protected by .gitignore)
   - ✅ More secure for production deployments
   - ✅ Centralized configuration management

#### **Method 2: Local Storage Fallback**

If environment variables are not available, the application supports local storage fallback:

1. **Enable Fallback Mode:**
   - Set `REACT_APP_ENABLE_LOCAL_STORAGE_FALLBACK=true` in `.env`

2. **Configure via UI:**
   - Navigate to Resume Analyzer page
   - Enter API key in the configuration field
   - Key is securely stored in browser's local storage

#### **Configuration Priority**
1. **Environment Variables** (highest priority)
2. **Local Storage** (fallback, if enabled)
3. **Manual Entry** (temporary session only)

#### **Usage Notes:**
- Free tier includes generous quotas for testing
- Rate limiting is handled automatically by the application
- Environment variables are the recommended approach for security

<br />

## **Project Structure**

```
AI-Resume-Analyzer/
├── public/                    # Static assets and index.html
├── src/
│   ├── components/           # Reusable React components
│   │   ├── Header.js        # Main navigation header
│   │   ├── Sidebar.js       # Dashboard sidebar navigation
│   │   ├── FileUpload.js    # Drag & drop file upload
│   │   └── ...
│   ├── pages/               # Main page components
│   │   ├── Dashboard.js     # Landing dashboard
│   │   ├── ResumeAnalyzer.js # AI analysis interface
│   │   ├── JobScraper.js    # Job search demo
│   │   └── ...
│   ├── services/            # Business logic and API integration
│   │   ├── resumeAnalyzer.js # Google Gemini AI integration
│   │   ├── documentProcessor.js # PDF/DOCX text extraction
│   │   ├── realJobSearchService.js # Demo job search data
│   │   └── ...
│   ├── context/             # React context providers
│   │   └── ApiKeyContext.js # API key state management
│   ├── App.js              # Main application component
│   └── index.js            # Application entry point
├── package.json            # Project dependencies and scripts
├── tailwind.config.js      # Tailwind CSS configuration
└── README.md              # Project documentation
```

<br />

## **Contributing**

1. **Fork the repository**
2. **Create your feature branch:** `git checkout -b feature/AmazingFeature`
3. **Commit your changes:** `git commit -m 'Add some AmazingFeature'`
4. **Push to the branch:** `git push origin feature/AmazingFeature`
5. **Open a Pull Request**

---

**🚀 Ready to optimize your resume? Start your career journey today!**

*Built with ❤️ using React and Google Gemini AI*