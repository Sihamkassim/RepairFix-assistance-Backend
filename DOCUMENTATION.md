# RepairFix Assistant - Backend Documentation

## 01. Project Overview

RepairFix Assistant is an AI-powered electronics repair guide that helps users fix their devices using official iFixit repair guides. The backend is built with Node.js/Express and uses LangGraph for orchestrating a multi-step AI workflow.

---

## 02. Technology Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | 18+ | Runtime environment |
| Express.js | 4.x | Web framework |
| LangGraph | Latest | AI workflow orchestration |
| Google Gemini | 2.5-flash | Large Language Model |
| PostgreSQL (Neon) | - | Cloud database |
| Clerk | - | Authentication |
| Tavily | - | Web search fallback |
| Axios | - | HTTP client |
| dotenv | 17.x | Environment variables |
| nodemon | - | Development server |

---

## 03. Project Structure

```
RepairFix-assistance-Backend/
├── index.js                 # Application entry point
├── fix-trigger.js           # Database trigger fix utility
├── package.json             # Dependencies & scripts
├── .env                     # Environment variables
│
├── agents/                  # LangGraph AI Workflow
│   ├── repairAssistant.js   # Main workflow graph definition
│   ├── routing.js           # Conditional routing logic
│   ├── state.js             # State schema definition
│   └── nodes/               # Individual workflow nodes
│       ├── index.js         # Node exports
│       ├── 01_identifyDevice.js
│       ├── 02_searchIFixit.js
│       ├── 03_getGuides.js
│       ├── 04_selectGuide.js
│       ├── 05_getGuideDetails.js
│       ├── 06_fallbackSearch.js
│       ├── 07_generateResponse.js
│       └── 08_saveToDB.js
│
├── config/                  # Configuration
│   ├── clerk.js             # Clerk authentication setup
│   └── db.js                # PostgreSQL connection pool
│
├── controllers/             # Request handlers
│   └── userController.js    # User-related logic
│
├── middleware/              # Express middleware
│   └── auth.js              # JWT authentication
│
├── migrations/              # Database migrations
│   ├── 001_initial_schema.sql
│   ├── migrate.js           # Migration runner
│   └── README.md
│
├── models/                  # Database models
│   └── index.js             # User, Conversation, Message, Usage models
│
├── routes/                  # API routes
│   ├── index.js             # Route aggregator
│   ├── chatRoutes.js        # Chat & SSE streaming endpoints
│   └── userRoutes.js        # User profile endpoints
│
└── services/                # External services
    ├── ai.js                # Gemini AI service
    ├── ifixit.js            # iFixit API service
    └── tavily.js            # Tavily search service
```

---

## 04. Environment Variables

Create a `.env` file with the following variables:

```env
# Server
PORT=5000
NODE_ENV=development

# Database (Neon PostgreSQL)
DATABASE_URL=postgresql://user:password@host/database?sslmode=require

# Authentication (Clerk)
CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# AI Services
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.5-flash

# Search Fallback
TAVILY_API_KEY=your_tavily_api_key
```

---

## 05. Database Schema

### Tables

#### users
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  clerk_id VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255),
  name VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### conversations
```sql
CREATE TABLE conversations (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  title VARCHAR(255) DEFAULT 'New Conversation',
  started_at TIMESTAMP DEFAULT NOW(),
  last_updated TIMESTAMP DEFAULT NOW()
);
```

#### messages
```sql
CREATE TABLE messages (
  id SERIAL PRIMARY KEY,
  conversation_id INTEGER REFERENCES conversations(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL,  -- 'user' or 'assistant'
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### usage
```sql
CREATE TABLE usage (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  tokens_used INTEGER DEFAULT 0,
  date DATE DEFAULT CURRENT_DATE,
  UNIQUE(user_id, date)
);
```

### Triggers

```sql
-- Auto-update last_updated on conversations
CREATE OR REPLACE FUNCTION update_last_updated_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_updated = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_conversations_last_updated
BEFORE UPDATE ON conversations
FOR EACH ROW
EXECUTE FUNCTION update_last_updated_column();
```

---

## 06. LangGraph Workflow Architecture

The AI workflow is built using **LangGraph**, a library for building stateful, multi-step AI applications.

### Workflow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         START                                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Node 1: identifyDevice                                         │
│  - Uses Gemini to extract device name and issue from message    │
│  - Example: "cracked iPhone screen" → device: iPhone, issue:    │
│    cracked screen                                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Node 2: searchIFixit                                           │
│  - Searches iFixit API for matching devices                     │
│  - Returns list of device matches                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Router: routeAfterSearch                                       │
│  - If devices found → getGuides                                 │
│  - If no devices → fallbackSearch                               │
└─────────────────────────────────────────────────────────────────┘
                    │                       │
          (devices found)           (no devices)
                    │                       │
                    ▼                       ▼
┌──────────────────────────┐    ┌──────────────────────────┐
│  Node 3: getGuides       │    │  Node 6: fallbackSearch  │
│  - Fetches repair guides │    │  - Uses Tavily search    │
│    for the device        │    │  - Web search for info   │
└──────────────────────────┘    └──────────────────────────┘
                    │                       │
                    ▼                       │
┌──────────────────────────┐                │
│  Node 4: selectGuide     │                │
│  - AI selects best guide │                │
│    matching the issue    │                │
└──────────────────────────┘                │
                    │                       │
                    ▼                       │
┌──────────────────────────┐                │
│  Node 5: getGuideDetails │                │
│  - Fetches full guide    │                │
│    with steps & images   │                │
└──────────────────────────┘                │
                    │                       │
                    └───────────┬───────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  Node 7: generateResponse                                       │
│  - Gemini generates user-friendly response                      │
│  - Includes repair steps, tools, warnings                       │
│  - Streams response via SSE                                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Node 8: saveToDB                                               │
│  - Saves conversation to PostgreSQL                             │
│  - Saves user message and assistant response                    │
│  - Tracks token usage                                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                          END                                     │
└─────────────────────────────────────────────────────────────────┘
```

### State Schema

```javascript
// agents/state.js
export const RepairAssistantState = Annotation.Root({
  // Input
  userId: Annotation(),
  conversationId: Annotation(),
  userMessage: Annotation(),
  
  // Device identification
  device: Annotation(),
  issue: Annotation(),
  
  // iFixit data
  devices: Annotation(),
  guides: Annotation(),
  selectedGuide: Annotation(),
  guideDetails: Annotation(),
  
  // Fallback
  searchResults: Annotation(),
  
  // Output
  response: Annotation(),
  tokensUsed: Annotation(),
  error: Annotation(),
});
```

### Node Implementation Example

```javascript
// agents/nodes/identifyDevice.js
export async function identifyDeviceNode(state) {
  console.log('🔍 Node 1: Identifying device...');
  
  const prompt = `Extract the device and issue from this message:
    "${state.userMessage}"
    Return JSON: {"device": "...", "issue": "..."}`;
  
  const result = await aiService.generateJSON(prompt);
  
  return {
    device: result.device,
    issue: result.issue,
  };
}
```

---

## 07. API Endpoints

### Authentication
All endpoints require a valid Clerk JWT token in the `Authorization` header:
```
Authorization: Bearer <clerk_token>
```

### Endpoints

#### Chat Routes (`/api/chat`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/stream` | SSE streaming chat endpoint |
| GET | `/conversations/:id` | Get conversation with messages |
| DELETE | `/conversations/:id` | Delete a conversation |

##### GET /api/chat/stream

Query parameters:
- `message` (required): User's message
- `conversationId` (optional): Existing conversation ID

Response: Server-Sent Events stream

```javascript
// Event types:
{ type: 'status', message: 'Identifying device...' }
{ type: 'token', content: 'Here is...' }
{ type: 'done', conversationId: 123 }
{ type: 'error', message: 'Error description' }
```

#### User Routes (`/api/user`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/profile` | Get user profile |
| GET | `/conversations` | List all conversations |
| GET | `/usage` | Get usage statistics |

---

## 08. Gemini AI Integration

### Configuration

```javascript
// services/ai.js
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ 
  model: process.env.GEMINI_MODEL || 'gemini-2.5-flash' 
});
```

### Usage Modes

#### 1. JSON Generation (Non-streaming)
Used for structured data extraction (device identification, guide selection).

```javascript
async generateJSON(prompt) {
  const result = await model.generateContent(prompt);
  const text = result.response.text();
  return JSON.parse(text);
}
```

#### 2. Streaming Response
Used for generating the final user-facing response.

```javascript
async *streamResponse(prompt) {
  const result = await model.generateContentStream(prompt);
  for await (const chunk of result.stream) {
    yield chunk.text();
  }
}
```

---

## 09. iFixit API Integration

### Service Methods

```javascript
// services/ifixit.js
export const iFixitService = {
  // Search for devices
  async searchDevices(query) { ... },
  
  // Get repair guides for a device
  async getDeviceGuides(deviceTitle) { ... },
  
  // Get detailed guide with steps
  async getGuideDetails(guideId) { ... },
  
  // Format guide as markdown
  formatGuideAsMarkdown(guide) { ... },
};
```

### API Endpoints Used

| Endpoint | Purpose |
|----------|---------|
| `GET /search/{query}?filter=device` | Search devices |
| `GET /wikis/CATEGORY/{device}` | Get device guides |
| `GET /guides/{guideId}` | Get guide details |

---

## 10. Server-Sent Events (SSE) Streaming

The chat endpoint uses SSE to stream responses in real-time.

### Implementation

```javascript
// routes/chatRoutes.js
router.get('/stream', requireAuth, async (req, res) => {
  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  
  // Send status updates
  const sendStatus = (message) => {
    res.write(`data: ${JSON.stringify({ type: 'status', message })}\n\n`);
  };
  
  // Stream tokens
  for await (const chunk of workflow.stream()) {
    res.write(`data: ${JSON.stringify({ type: 'token', content: chunk })}\n\n`);
  }
  
  // End stream
  res.write(`data: ${JSON.stringify({ type: 'done', conversationId })}\n\n`);
  res.end();
});
```

---

## 11. Authentication with Clerk

### Middleware

```javascript
// middleware/auth.js
import { clerkClient } from '@clerk/clerk-sdk-node';

export const requireAuth = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  try {
    const decoded = await clerkClient.verifyToken(token);
    req.auth = { userId: decoded.sub };
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};
```

---

## 12. Error Handling

### Global Error Handler

```javascript
// index.js
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});
```

### Workflow Error Handling

Each node catches and logs errors, returning appropriate state updates:

```javascript
try {
  // Node logic
} catch (error) {
  console.error('Node error:', error);
  return { error: error.message };
}
```

---

## 13. Running the Server

### Development

```bash
# Install dependencies
npm install

# Run database migrations
node migrations/migrate.js

# Fix database triggers (if needed)
node fix-trigger.js

# Start development server
npm run dev
```

### Production

```bash
npm start
```

---

## 14. Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `start` | `node index.js` | Production server |
| `dev` | `nodemon index.js` | Development with auto-reload |
| `migrate` | `node migrations/migrate.js` | Run database migrations |

---

## 15. Future Improvements

- [ ] Add rate limiting per user
- [ ] Implement caching for iFixit API responses
- [ ] Add WebSocket support for bi-directional communication
- [ ] Add image upload for device identification
- [ ] Implement conversation summarization for long chats
- [ ] Add multi-language support
