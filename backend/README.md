# AI Resume Analyzer Backend

Express.js server for processing PDF and DOCX documents server-side to eliminate client-side performance issues.

## Features

- **PDF Processing**: Extract text from PDF files using `pdf-parse`
- **DOCX Processing**: Extract text from DOCX/DOC files using `mammoth`
- **Smart Chunking**: Intelligent text splitting for AI processing
- **File Validation**: Secure file type and size validation
- **CORS Support**: Cross-origin resource sharing for frontend integration
- **Error Handling**: Comprehensive error handling and logging

## Prerequisites

- Node.js 14+ installed
- NPM or Yarn package manager

## Installation

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create environment file:
```bash
cp .env.example .env
```

4. Edit `.env` file if needed (default settings work for local development)

## Usage

### Development Mode

Start the server in development mode with auto-restart:

```bash
npm run dev
```

The server will start on `http://localhost:5000`

### Production Mode

Start the server in production mode:

```bash
npm start
```

## API Endpoints

### Health Check
- **GET** `/api/health`
- Returns server status and uptime

### Process Document
- **POST** `/api/process-document`
- Upload and process PDF or DOCX files
- **Body**: FormData with `document` field
- **Optional Parameters**: `chunkSize`, `overlap`
- **Response**: Extracted text, chunks, metadata, and analysis

### File Info
- **POST** `/api/file-info`
- Get file information without processing
- **Body**: FormData with `document` field
- **Response**: File metadata (size, type, etc.)

## Configuration

### Environment Variables

- `PORT`: Server port (default: 5000)
- `FRONTEND_URL`: Frontend URL for CORS (default: http://localhost:3000)

### File Upload Limits

- Maximum file size: 50MB
- Supported formats: PDF, DOCX, DOC
- Memory storage (files are not saved to disk)

## Error Handling

The server includes comprehensive error handling for:
- Invalid file types
- File size limits
- Processing errors
- Memory issues
- Network timeouts

## Security Features

- File type validation
- Size limits
- Memory-based storage (no files saved to disk)
- CORS protection
- Input sanitization

## Performance

- Server-side processing eliminates browser memory issues
- Optimized text extraction algorithms
- Efficient chunking for large documents
- Memory management for concurrent requests

## Frontend Integration

The backend is designed to work seamlessly with the React frontend:

1. Frontend attempts backend processing first
2. Automatic fallback to frontend processing if backend unavailable
3. Transparent error handling and user notifications
4. Processing method indicators in UI

## Troubleshooting

### Backend Server Won't Start
- Check if port 5000 is available
- Verify Node.js version (14+ required)
- Check npm dependencies are installed

### File Processing Errors
- Verify file format is supported (PDF, DOCX, DOC)
- Check file size is under 50MB limit
- Ensure file is not corrupted

### CORS Issues
- Verify `FRONTEND_URL` in `.env` matches your frontend URL
- Check browser developer tools for specific CORS errors

## Development

### Project Structure
```
backend/
├── server.js          # Main server file
├── package.json       # Dependencies and scripts
├── .env.example      # Environment template
└── README.md         # This file
```

### Adding Features
1. Add new routes in `server.js`
2. Update API documentation
3. Test with frontend integration
4. Add error handling

### Testing
- Use Postman or curl to test API endpoints
- Test with various file types and sizes
- Verify error handling scenarios

## License

Part of AI Resume Analyzer - GenAI Hackathon 2025 Project