import { useState, useMemo, useEffect } from 'react'
import { useAppStore } from '../store'
import * as api from '../api'

const initialNotes = [
  { id: 1, title: 'Clean Architecture Patterns', subject: 'Software Engineering', content: '### 🌐 Clean Architecture Outline\nConcentric layers:\n- **Entities**: Core business objects\n- **Use Cases**: App-specific rules\n- **Interface Adapters**: Controllers, presenters, gateways\n- **Frameworks & Drivers**: Web, DB, UI.\n\nMaintains strict decoupling from database drivers and UI components.' },
  { id: 2, title: 'OS Kernel Scheduler & Multi-tasking', subject: 'Backend Systems', content: '### ⚙️ Process Scheduler Specs\nManages active processor execution loops. Implements scheduling filters:\n- **Round Robin**: Equal time-slicing\n- **FIFO**: First-in first-out queues\n- **Multi-Level Feedback**: Dynamically shifts queue priorities to optimize CPU throughput.' },
]

const subjectSuggestions = [
  'Software Engineering',
  'System Design',
  'Frontend Engineering',
  'Backend Systems',
  'Database Design',
  'DevOps & Cloud',
  'Machine Learning / AI',
  'Product Design',
  'General Notes'
]

// Ready-to-use Markdown Templates for planning
const noteTemplates = {
  websitePlan: `### 🌐 Project Overview
*Describe how this website/application works under the hood and what key problems it solves.*

### 🛠️ Technology Stack
- **Frontend**: React (Vite / Next.js)
- **Backend API**: Node.js (Express / NestJS)
- **Database Datastore**: MongoDB / PostgreSQL
- **Real-time Engine**: Socket.io / WebSockets

### 🗺️ Client Routing & Sitemap
- \`/\` - Landing page and feature list.
- \`/login\` & \`/signup\` - JWT Auth gateways.
- \`/dashboard\` - Main authenticated command panel.

### 🗄️ Database Schemas & Collections
- **users**: { id, email, password, profilePic, occupation }
- **projects**: { id, title, description, category, completedAt }`,

  businessModel: `### 💼 Business Model & Scaling Strategy
*How the website generates revenue, structures pricing tiers, and grows.*

### 🎯 Core Value Proposition
- Target users: Indie hackers, SaaS developers, and freelance programmers.
- Value added: Double productivity metrics & trace cash flow from study sessions.

### 💳 Monetization & Pricing Tiers
- **Free Account**: Limited boards.
- **Developer Premium**: Unlimited vault records and advanced graphs.

### 📣 Marketing & Growth Hooks
- Share sitemaps generated in sitemaps modeler on Twitter/LinkedIn to attract clients.

### 💰 Active Ledger Transactions (Auto-Syncs to Wealth Vault on Save)
[earning: 49.00 | cat: UI Package | desc: Gumroad sale of Lumina Boilerplate]
[expense: 15.00 | cat: Server | desc: AWS hosting monthly fee]
[saving: 29.00 | cat: SaaS | desc: Cancelled unused cursor subscription]

### 🥗 Health & Nutrition Tracker (Auto-Syncs to Health Vault on Save)
[protein: 30 | cal: 400 | food: Chicken Breast]
[protein: 24 | cal: 120 | food: Whey Protein Shake]`,

  projectPlanning: `### 📋 Project Planning & Milestone Roadmap
*Outline the core milestones, timeline, and delivery requirements for the current project.*

### 🎯 Core Milestones
- **Milestone 1**: Complete high-fidelity designs & layout system
- **Milestone 2**: Build interactive components & Notion integration
- **Milestone 3**: Setup Express API server & connect MongoDB
- **Milestone 4**: Conduct deployment & speed optimization checks

### 💡 Core Features to Deliver
1. Interactive Dashboard widget summaries
2. Real-time checklist and progress trackers for active pages
3. Auto-syncing ledgers with Wealth and Health Vault profiles`,
}

// Helper to parse inline formatting like `code`, **bold**, *italic*, [ledger/protein brackets], and images
const parseInlineFormatting = (text, images = [], onImageClick) => {
  if (!text) return ''
  
  let tokens = [{ type: 'text', content: text }]
  
  // 1. Process inline images first: ![alt](src)
  // This prevents the image brackets from matching sync tags or bold styling.
  tokens = tokens.flatMap(token => {
    if (token.type !== 'text') return token
    const parts = token.content.split(/(\!\[.*?\]\(.*?\))/g)
    return parts.map(part => {
      const match = part.match(/^\!\[(.*?)\]\((.*?)\)$/)
      if (match) {
        return { type: 'image', alt: match[1], src: match[2] }
      }
      return { type: 'text', content: part }
    })
  })
  
  // 2. Process inline code: `code`
  tokens = tokens.flatMap(token => {
    if (token.type !== 'text') return token
    const parts = token.content.split('`')
    return parts.map((part, index) => {
      if (index % 2 === 1) {
        return { type: 'code', content: part }
      }
      return { type: 'text', content: part }
    })
  })
  
  // 3. Process bold: **bold**
  tokens = tokens.flatMap(token => {
    if (token.type !== 'text') return token
    const parts = token.content.split('**')
    return parts.map((part, index) => {
      if (index % 2 === 1) {
        return { type: 'bold', content: part }
      }
      return { type: 'text', content: part }
    })
  })

  // 4. Process italic: *italic*
  tokens = tokens.flatMap(token => {
    if (token.type !== 'text') return token
    const parts = token.content.split('*')
    return parts.map((part, index) => {
      if (index % 2 === 1) {
        return { type: 'italic', content: part }
      }
      return { type: 'text', content: part }
    })
  })

  // 5. Process custom sync tags: [earning: ...], [expense: ...], [saving: ...], [protein: ...]
  tokens = tokens.flatMap(token => {
    if (token.type !== 'text') return token
    const parts = token.content.split(/(\[.*?\])/g)
    return parts.map((part) => {
      if (part.startsWith('[') && part.endsWith(']')) {
        return { type: 'sync_tag', content: part }
      }
      return { type: 'text', content: part }
    })
  })

  return tokens.map((t, idx) => {
    switch (t.type) {
      case 'image':
        const foundImg = images.find(img => img.id === t.src || img.src === t.src)
        if (foundImg) {
          return (
            <span key={idx} className="my-2 block text-center select-none">
              <span className="relative group/inline-img inline-block max-w-full rounded-2xl overflow-hidden border border-slate-800 bg-slate-950/40 p-1 hover:border-purple-500/30 transition duration-300 shadow-md">
                <img
                  src={foundImg.src}
                  alt={t.alt || 'Pasted Image'}
                  className="max-h-48 w-auto object-contain rounded-xl cursor-zoom-in hover:scale-[1.01] transition duration-300 animate-scale-up"
                  onClick={() => onImageClick(foundImg.src)}
                />
                <span className="absolute bottom-2 right-2 bg-slate-900/80 border border-slate-850 px-2.5 py-0.5 rounded-md text-[9px] text-slate-400 font-bold opacity-0 group-hover/inline-img:opacity-100 transition-opacity">
                  🔍 Click to Zoom
                </span>
              </span>
              {t.alt && <span className="block text-[10px] text-slate-500 mt-1 italic font-sans">{t.alt}</span>}
            </span>
          )
        }
        return <span key={idx} className="text-rose-455 text-xs italic">[Image not found: {t.src}]</span>
      case 'code':
        return <code key={idx} className="bg-slate-900 border border-slate-800 text-purple-300 px-1 py-0.5 rounded text-[10px] font-mono mx-0.5">{t.content}</code>
      case 'bold':
        return <strong key={idx} className="font-extrabold text-white">{t.content}</strong>
      case 'italic':
        return <em key={idx} className="italic text-slate-200">{t.content}</em>
      case 'sync_tag':
        const tagText = t.content
        const isEarning = tagText.includes('earning:')
        const isExpense = tagText.includes('expense:')
        const isSaving = tagText.includes('saving:')
        const isProtein = tagText.includes('protein:')
        const isCal = tagText.includes('cal:')
        const isFood = tagText.includes('food:')
        
        // If it doesn't look like a known wealth/health tracker tag, keep it as regular text
        if (!isEarning && !isExpense && !isSaving && !isProtein && !isCal && !isFood) {
          return tagText
        }

        let colorClass = 'bg-slate-900 border-slate-800 text-slate-400'
        if (isEarning) colorClass = 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
        else if (isExpense) colorClass = 'bg-rose-500/10 border-rose-500/20 text-rose-400'
        else if (isSaving) colorClass = 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400'
        else if (isProtein || isCal || isFood) colorClass = 'bg-amber-500/10 border-amber-500/20 text-amber-400'

        return <span key={idx} className={`inline-block px-1.5 py-0.5 rounded border text-[10px] font-mono mx-0.5 font-bold ${colorClass}`}>{tagText}</span>
      default:
        return t.content
    }
  })
}

// Simple Markdown block parser to render HTML in Preview tab
const renderMarkdown = (content, images = [], onImageClick) => {
  if (!content) return <p className="text-xs text-slate-500 italic">No content written yet.</p>
  
  const lines = content.split('\n')
  return lines.map((line, idx) => {
    // Check for headers
    if (line.startsWith('### ')) {
      return (
        <h4 key={idx} className="text-sm font-bold text-slate-100 mt-4 mb-2 tracking-wide border-b border-slate-800 pb-1 flex items-center gap-1.5">
          {parseInlineFormatting(line.substring(4), images, onImageClick)}
        </h4>
      )
    }
    if (line.startsWith('## ')) {
      return (
        <h3 key={idx} className="text-base font-extrabold text-slate-100 mt-5 mb-2.5 tracking-tight flex items-center gap-1.5">
          {parseInlineFormatting(line.substring(3), images, onImageClick)}
        </h3>
      )
    }
    if (line.startsWith('# ')) {
      return (
        <h2 key={idx} className="text-lg font-black text-slate-100 mt-6 mb-3 tracking-tight flex items-center gap-1.5">
          {parseInlineFormatting(line.substring(2), images, onImageClick)}
        </h2>
      )
    }
    
    // Check for list item
    if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
      const cleanLine = line.trim().substring(2)
      return (
        <li key={idx} className="text-xs text-slate-300 ml-4 list-disc list-inside leading-relaxed py-0.5">
          {parseInlineFormatting(cleanLine, images, onImageClick)}
        </li>
      )
    }

    // Check for ordered list item
    const matchOrdered = line.trim().match(/^(\d+)\.\s(.*)/)
    if (matchOrdered) {
      return (
        <li key={idx} className="text-xs text-slate-300 ml-4 list-decimal list-inside leading-relaxed py-0.5">
          {parseInlineFormatting(matchOrdered[2], images, onImageClick)}
        </li>
      )
    }
    
    // Empty line spacer
    if (line.trim() === '') {
      return <div key={idx} className="h-3" />
    }
    
    return (
      <p key={idx} className="text-xs text-slate-300 leading-relaxed py-0.5 font-sans min-h-[1.2em]">
        {parseInlineFormatting(line, images, onImageClick)}
      </p>
    )
  })
}

const codingChallenges = [
  // --- JAVASCRIPT / NODE / EXPRESS / MONGO CHALLENGES ---
  {
    id: 'js-async',
    title: '🧠 Node.js Asynchronous Promises',
    language: 'javascript',
    difficulty: 'Medium',
    description: 'Practice working with Promises, async/await, and error handling in Node.js. Implement a function to simulate fetching data from two database APIs concurrently, combine the results, and handle any connection failures gracefully.',
    starterCode: `// Mock DB async queries
const fetchUserData = (id) => new Promise(resolve => setTimeout(() => resolve({ id, name: 'Sachin', role: 'admin' }), 200));
const fetchUserStats = (id) => new Promise(resolve => setTimeout(() => resolve({ id, logins: 124, score: 98 }), 300));

// TASK: Implement fetchMergedProfile to query concurrently
async function fetchMergedProfile(userId) {
  print("Starting profile retrieval for user: " + userId);
  try {
    // Write code below to fetch user data and stats concurrently using Promise.all
    const [data, stats] = await Promise.all([
      fetchUserData(userId),
      fetchUserStats(userId)
    ]);
    
    return {
      success: true,
      profile: { ...data, stats }
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// TEST RUN
fetchMergedProfile(42).then(result => {
  print("Merged Result: " + JSON.stringify(result, null, 2));
});
`
  },
  {
    id: 'js-express-route',
    title: '🌐 Express.js CRUD Controller & Auth Routing',
    language: 'javascript',
    difficulty: 'Medium',
    description: 'Implement an Express.js middleware and route controller. Parse incoming headers to check for an "authorization" token. If present and valid, parse body parameter and allow update, otherwise return 401 Unauthorized.',
    starterCode: `const mockDatabase = { userId: 42, username: 'sachin_dev', verified: true };

// Mock Express Middleware
function authenticateToken(req, res, next) {
  const token = req.headers['authorization'];
  if (!token || token !== 'Bearer secret-jwt-key') {
    return res({ status: 401, body: { error: 'Unauthorized: Missing or invalid token' } });
  }
  req.user = { userId: 42, role: 'admin' };
  next();
}

// Controller logic
function updateProfileController(req, res) {
  print("Controller triggered by user: " + JSON.stringify(req.user));
  const { newUsername } = req.body;
  if (!newUsername) {
    return res({ status: 400, body: { error: 'Bad Request: newUsername is required' } });
  }
  
  mockDatabase.username = newUsername;
  return res({ status: 200, body: { message: 'Username updated successfully', data: mockDatabase } });
}

// SIMULATION ENGINE
function simulateRequest(req) {
  let middlewarePassed = false;
  let finalResponse = null;

  const res = (response) => { finalResponse = response; };
  const next = () => { middlewarePassed = true; };

  authenticateToken(req, res, next);

  if (middlewarePassed) {
    updateProfileController(req, res);
  }

  return finalResponse;
}

// RUN SIMULATION
print("--- TEST 1: Request without Auth Header ---");
const test1 = simulateRequest({ headers: {}, body: { newUsername: 'sachin_pro' } });
print("Result: " + JSON.stringify(test1));

print("\\n--- TEST 2: Request with Correct Auth Header ---");
const test2 = simulateRequest({ 
  headers: { 'authorization': 'Bearer secret-jwt-key' }, 
  body: { newUsername: 'sachin_pro' } 
});
print("Result: " + JSON.stringify(test2));
`
  },
  {
    id: 'js-mongoose-crud',
    title: '🗄️ MongoDB / Mongoose Query & CRUD Actions',
    language: 'javascript',
    difficulty: 'Hard',
    description: 'Practice writing MongoDB / Mongoose CRUD operations. Complete the Mongoose query mock code to find active users, update their streak value, and return only the user IDs and names.',
    starterCode: `// Mock Mongoose Model query methods
const UserModel = {
  find: async (query) => {
    print("Mongoose Model.find() called with query: " + JSON.stringify(query));
    return [
      { id: 1, name: 'Alice', active: true, streak: 5 },
      { id: 2, name: 'Bob', active: true, streak: 12 },
      { id: 3, name: 'Charlie', active: false, streak: 0 }
    ].filter(u => Object.keys(query).every(k => u[k] === query[k]));
  },
  
  updateOne: async (filter, update) => {
    print("Mongoose Model.updateOne() called with filter: " + JSON.stringify(filter) + " and update: " + JSON.stringify(update));
    return { acknowledged: true, modifiedCount: 1 };
  }
};

// TASK: Implement database operations helper
async function incrementActiveUserStreak(userId) {
  // 1. Find the active user
  const users = await UserModel.find({ id: userId, active: true });
  if (users.length === 0) {
    print("User not found or is inactive");
    return false;
  }
  
  const user = users[0];
  const newStreak = user.streak + 1;
  
  // 2. Update the streak value in DB
  const updateResult = await UserModel.updateOne(
    { id: userId }, 
    { $set: { streak: newStreak } }
  );
  
  print("Updated streak to: " + newStreak);
  return { success: true, newStreak };
}

// RUN DB METHOD
incrementActiveUserStreak(2).then(res => {
  print("DB Operation Result: " + JSON.stringify(res));
});
`
  },
  {
    id: 'js-complete-stack',
    title: '🌐 Complete Express & MongoDB Stack',
    language: 'javascript',
    difficulty: 'Hard',
    description: 'Implement a full server application stack featuring a mock MongoDB database connection, custom authentication middleware, a user router, and controller endpoints. Complete the authenticateToken signature validation and processCheckout balance checking/deductions.',
    files: {
      'db.js': `// db.js - Mock MongoDB/Mongoose Connection
const mockDatabase = {
  users: [
    { id: 'usr_42', username: 'sachin_dev', verified: true, balance: 200.00 }
  ],
  transactions: []
};

const db = {
  connect: async () => {
    print("🔌 MongoDB: Connecting to database cluster...");
    await new Promise(r => setTimeout(r, 150));
    print("✅ MongoDB: Database connection established!");
  },

  findUserById: async (id) => {
    return mockDatabase.users.find(u => u.id === id) || null;
  },

  updateUserBalance: async (id, newBalance) => {
    const user = mockDatabase.users.find(u => u.id === id);
    if (user) {
      user.balance = newBalance;
      print("💾 MongoDB: Updated user balance to $" + newBalance.toFixed(2));
    }
    return user;
  },

  createTransaction: async (userId, amount, item) => {
    const txn = {
      id: 'txn_' + Math.floor(Math.random() * 900000 + 100000),
      userId,
      amount,
      item,
      timestamp: new Date().toISOString()
    };
    mockDatabase.transactions.push(txn);
    print("💾 MongoDB: Saved transaction " + txn.id + " for $" + amount);
    return txn;
  }
};

module.exports = db;`,

      'middleware/auth.js': `// middleware/auth.js - JWT Authentication Middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res(401, { error: 'Unauthorized: Missing authorization header' });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res(401, { error: 'Unauthorized: Invalid token format' });
  }

  // TASK: Verify signature and decode user payload
  // The client will send "Bearer sachin-jwt-secret-key"
  if (token !== 'sachin-jwt-secret-key') {
    return res(401, { error: 'Unauthorized: Access token is invalid or expired' });
  }

  // Populate req.user
  req.user = { id: 'usr_42', role: 'admin' };
  print("🔑 Auth Middleware: JWT token successfully validated");
  next();
}

module.exports = authenticateToken;`,

      'controllers/userController.js': `// controllers/userController.js - Handles business operations
const db = require('./db');

const userController = {
  getProfile: async (req, res) => {
    const user = await db.findUserById(req.user.id);
    if (!user) {
      return res(404, { error: 'User profile not found' });
    }
    return res(200, { success: true, user });
  },

  processCheckout: async (req, res) => {
    const { itemId, amount, itemName } = req.body;

    if (!itemId || !amount || !itemName) {
      return res(400, { error: 'Bad Request: itemId, amount, and itemName are required' });
    }

    const user = await db.findUserById(req.user.id);
    if (!user) {
      return res(404, { error: 'User account not found' });
    }

    // TASK: Implement balance validation and checkout processing
    if (user.balance < amount) {
      return res(400, { error: "Payment failed: Insufficient balance. Required: $" + amount + ", Available: $" + user.balance });
    }

    const newBalance = user.balance - amount;
    await db.updateUserBalance(user.id, newBalance);
    const transaction = await db.createTransaction(user.id, amount, itemName);

    return res(200, {
      message: 'Checkout completed successfully',
      transaction,
      balanceRemaining: newBalance
    });
  }
};

module.exports = userController;`,

      'routes/user.js': `// routes/user.js - Maps API endpoints to controller actions
const authenticateToken = require('../middleware/auth');
const userController = require('../controllers/userController');

function configureRoutes(app) {
  print("🔗 Routes: Registering core endpoints...");
  
  // Profile endpoint
  app.get('/api/users/profile', authenticateToken, userController.getProfile);
  
  // TASK: Mount POST checkout endpoint using authenticateToken middleware
  app.post('/api/checkout', authenticateToken, userController.processCheckout);
}

module.exports = configureRoutes;`,

      'app.js': `// app.js - Server Configuration & Mock HTTP Router
const db = require('./db');
const configureRoutes = require('./routes/user');

const app = {
  routes: {},

  get(path, ...pipeline) {
    this.routes['GET:' + path] = pipeline;
  },

  post(path, ...pipeline) {
    this.routes['POST:' + path] = pipeline;
  },

  // Simulated request dispatcher
  async handleRequest(req) {
    const key = req.method + ':' + req.path;
    const pipeline = this.routes[key];

    if (!pipeline) {
      return { status: 404, body: { error: 'Not Found: Route ' + key + ' is not registered' } };
    }

    let currentIdx = 0;
    let response = null;

    const res = (status, body) => {
      response = { status, body };
    };

    const next = () => {
      currentIdx++;
      if (currentIdx < pipeline.length) {
        const nextHandler = pipeline[currentIdx];
        nextHandler(req, res, next);
      }
    };

    // Execute first middleware or controller in the pipeline
    try {
      await pipeline[0](req, res, next);
    } catch (err) {
      print("🔴 Server Error: " + err.message);
      return { status: 500, body: { error: 'Internal Server Error' } };
    }

    return response || { status: 500, body: { error: 'No response returned by handler' } };
  }
};

async function startServer() {
  print("🚀 App: Initializing Express.js Application Server...");
  
  // Connect DB
  await db.connect();
  
  // Register routes
  configureRoutes(app);

  print("⚡ App: Express application is ready for HTTP traffic!");
  return app;
}

module.exports = { app, startServer };`
    }
  },

  // --- RUST LANGUAGE CHALLENGES ---
  {
    id: 'rust-ownership',
    title: '🦀 Rust Ownership & Borrowing Basics',
    language: 'rust',
    difficulty: 'Easy',
    description: 'Learn Rust memory safety principles: ownership, move semantics, and references. Fix the code to borrow the string rather than moving ownership, allowing the main print statement to run successfully.',
    starterCode: `fn calculate_length(s: &String) -> usize {
    s.len()
}

fn main() {
    let s1 = String::from("Rust Lang");
    
    // TASK: Fix this line to pass a reference instead of moving s1
    let len = calculate_length(&s1);
    
    print!("The length of '{}' is {}.", s1, len);
}`
  },
  {
    id: 'rust-match',
    title: '🦀 Rust Option & Pattern Matching',
    language: 'rust',
    difficulty: 'Medium',
    description: 'Practice using Option enum and pattern matching in Rust. Complete the match statement to handle both Some(val) and None cases safely.',
    starterCode: `fn divide(numerator: f64, denominator: f64) -> Option<f64> {
    if denominator == 0.0 {
        None
    } else {
        Some(numerator / denominator)
    }
}

fn main() {
    let result = divide(10.0, 2.0);
    
    // TASK: Practice pattern matching on Option
    match result {
        Some(value) => print!("Division succeeded: {}", value),
        None => print!("Error: Cannot divide by zero!"),
    }
}`
  },
  {
    id: 'rust-struct-traits',
    title: '🦀 Rust Structs and Trait Implementations',
    language: 'rust',
    difficulty: 'Hard',
    description: 'Create custom data models using structs, and implement behaviors using traits. Implement a Summary trait for a NewsArticle struct.',
    starterCode: `pub trait Summary {
    fn summarize(&self) -> String;
}

pub struct NewsArticle {
    pub headline: String,
    pub author: String,
    pub content: String,
}

// TASK: Implement the Summary trait for NewsArticle
impl Summary for NewsArticle {
    fn summarize(&self) -> String {
        format!("{} by {}", self.headline, self.author)
    }
}

fn main() {
    let article = NewsArticle {
        headline: String::from("Rust 1.78 Released!"),
        author: String::from("Sachin"),
        content: String::from("Exciting new features..."),
    };
    
    print!("Summary: {}", article.summarize());
}`
  }
]

// Starter Vocabulary Pack
const initialVocabulary = [
  {
    id: 1,
    word: 'Mitigate',
    category: 'Coding Term',
    partOfSpeech: 'Verb',
    difficulty: 'Medium',
    definition: 'Make less severe, serious, or painful; lessen the gravity of an offense or mistake.',
    example: 'We must identify the security risks and take actions to mitigate them.',
    codeContext: 'We mitigated the database bottleneck by adding a Redis caching layer and indexing search keys.',
    mnemonic: 'Mitigate sounds like "gate" - closing a gate to stop a flood of incoming water or problems.',
    status: 'learning'
  },
  {
    id: 2,
    word: 'Caveat',
    category: 'General English',
    partOfSpeech: 'Noun',
    difficulty: 'Medium',
    definition: 'A warning or proviso of specific stipulations, conditions, or limitations.',
    example: 'He gave his recommendation with the caveat that it was based on incomplete data.',
    codeContext: 'This utility function simplifies third-party API integration, with the caveat that it does not auto-retry on server errors.',
    mnemonic: 'Caveat sounds like "cave at" - watch out, the cave ceiling might cave in if you go in unprepared!',
    status: 'learning'
  },
  {
    id: 3,
    word: 'Idempotent',
    category: 'Coding Term',
    partOfSpeech: 'Adjective',
    difficulty: 'Hard',
    definition: 'An operation or API call that produces the same result no matter how many times it is run.',
    example: 'The setting modification operation was idempotent, ensuring no duplicate states were created.',
    codeContext: 'To prevent duplicate transactions, we made our payment endpoint idempotent by validating a unique request key.',
    mnemonic: 'Idem (Latin for same) + Potent (power/effect) = Same effect every time.',
    status: 'learning'
  },
  {
    id: 4,
    word: 'Leverage',
    category: 'Business Idiom',
    partOfSpeech: 'Verb',
    difficulty: 'Easy',
    definition: 'Use something to maximum advantage; gain an advantage or leverage.',
    example: 'The firm will leverage its global network to expand sales.',
    codeContext: 'We can leverage React hooks to decouple component rendering from state management.',
    mnemonic: 'Using a lever to lift a heavy object easily - leveraging makes hard work simple.',
    status: 'learning'
  },
  {
    id: 5,
    word: 'Decouple',
    category: 'Coding Term',
    partOfSpeech: 'Verb',
    difficulty: 'Medium',
    definition: 'Separate, disengage, or dissociate (something from something else).',
    example: 'Decoupling our billing logic from the main application container simplifies unit testing.',
    codeContext: 'We decoupled the Frontend from the Backend using a clean API layer, allowing us to deploy each service independently.',
    mnemonic: 'Uncoupling train cars so they can move on different tracks independently.',
    status: 'learning'
  },
  {
    id: 6,
    word: 'Obfuscate',
    category: 'Coding Term',
    partOfSpeech: 'Verb',
    difficulty: 'Hard',
    definition: 'Render obscure, unclear, or unintelligible; make code difficult for humans to understand.',
    example: 'The writer tried to obfuscate the truth with overly complex language.',
    codeContext: 'Webpack is configured to minify and obfuscate our production bundle to protect proprietary algorithms.',
    mnemonic: 'Ob-fuse-cate - making code look like a bunch of blown fuses and confusing paths.',
    status: 'learning'
  },
  {
    id: 7,
    word: 'Transient',
    category: 'Coding Term',
    partOfSpeech: 'Adjective',
    difficulty: 'Medium',
    definition: 'Lasting only for a short time; impermanent.',
    example: 'A glass of cold water provided transient relief from the summer heat.',
    codeContext: 'We need to retry database connections on transient network errors, rather than failing immediately.',
    mnemonic: 'Transit - passing through quickly, like passengers in a transit terminal.',
    status: 'learning'
  },
  {
    id: 8,
    word: 'Bespoke',
    category: 'Business Idiom',
    partOfSpeech: 'Adjective',
    difficulty: 'Easy',
    definition: 'Made to order; custom-made; tailored to a specific client or task.',
    example: 'They hired a boutique design studio to create a bespoke branding system.',
    codeContext: 'We built a bespoke authentication provider to support the client\'s legacy LDAP directories.',
    mnemonic: 'Bespoke = "Been spoken for" - it was made specifically for a specific customer.',
    status: 'learning'
  }
]

export default function StudyNotes() {
  const parseNoteWealth = useAppStore((state) => state.parseNoteWealth)
  const parseNoteHealth = useAppStore((state) => state.parseNoteHealth)

  // Active Tab: 'notes' (default) or 'vocab'
  const [activeTab, setActiveTab] = useState('notes')

  // --- KNOWLEDGE NOTES STATE ---
  const [notes, setNotes] = useState([])
  const [notesLoading, setNotesLoading] = useState(true)
  const [activeNoteId, setActiveNoteId] = useState(null)
  const [workspaceMode, setWorkspaceMode] = useState('edit') // 'edit' or 'preview'
  const [workspaceSubTab, setWorkspaceSubTab] = useState('doc') // 'doc' or 'checklist'
  const [lightboxImage, setLightboxImage] = useState(null)
  
  // Auto-reset workspace mode and sub-tab to 'doc' when active note changes
  useEffect(() => {
    setWorkspaceMode('edit')
    setWorkspaceSubTab('doc')
  }, [activeNoteId])

  // Fetch and migrate notes on mount
  useEffect(() => {
    const loadNotesAndMigrate = async () => {
      setNotesLoading(true)
      try {
        // 1. Fetch notes from the database
        const dbRes = await api.fetchNotes()
        let currentNotes = dbRes.data || []

        // 2. Check for legacy localStorage notes to migrate
        const localSaved = localStorage.getItem('lumina_notes')
        if (localSaved) {
          try {
            const localNotes = JSON.parse(localSaved)
            if (localNotes && localNotes.length > 0) {
              console.log('Migrating local notes to database...', localNotes)
              // API supports batch array POST
              const migratedRes = await api.createNote(localNotes)
              const migratedNotes = migratedRes.data || []
              currentNotes = [...migratedNotes, ...currentNotes]
            }
          } catch (e) {
            console.error('Error parsing local notes for migration:', e)
          }
          localStorage.removeItem('lumina_notes')
        }

        // 3. Fallback to initial notes if DB is empty
        if (currentNotes.length === 0) {
          const initRes = await api.createNote(initialNotes)
          currentNotes = initRes.data || []
        }

        setNotes(currentNotes)

        // 4. Select the first note automatically
        if (currentNotes.length > 0) {
          setActiveNoteId((prevId) => {
            if (prevId && currentNotes.some((n) => n._id === prevId || n.id === prevId)) {
              const found = currentNotes.find((n) => n.id === prevId || n._id === prevId)
              return found._id || found.id
            }
            return currentNotes[0]._id || currentNotes[0].id
          })
        }
      } catch (err) {
        console.error('Error loading notes:', err)
        setMessage('Error loading notes from database.')
      } finally {
        setNotesLoading(false)
      }
    }

    loadNotesAndMigrate()
  }, [])

  // --- CODING ARENA STATE ---
  const [codingLanguage, setCodingLanguage] = useState('javascript') // 'javascript' or 'rust'
  const [codingChallenge, setCodingChallenge] = useState(codingChallenges[0])
  const [userCode, setUserCode] = useState(codingChallenges[0].starterCode)
  const [activeFile, setActiveFile] = useState(null)
  const [terminalLogs, setTerminalLogs] = useState([])
  const [previewKey, setPreviewKey] = useState(0)

  const handleSelectLanguage = (lang) => {
    setCodingLanguage(lang)
    const challengesForLang = codingChallenges.filter(c => c.language === lang)
    if (challengesForLang.length > 0) {
      const challenge = challengesForLang[0]
      setCodingChallenge(challenge)
      if (challenge.files) {
        setUserCode(challenge.files)
        setActiveFile(Object.keys(challenge.files)[0])
      } else {
        setUserCode(challenge.starterCode)
        setActiveFile(null)
      }
    }
    setTerminalLogs([])
    setPreviewKey(prev => prev + 1)
  }

  const handleSelectChallenge = (challengeId) => {
    const challenge = codingChallenges.find(c => c.id === challengeId)
    if (!challenge) return
    setCodingChallenge(challenge)
    if (challenge.files) {
      setUserCode(challenge.files)
      setActiveFile(Object.keys(challenge.files)[0])
    } else {
      setUserCode(challenge.starterCode)
      setActiveFile(null)
    }
    setTerminalLogs([])
    setPreviewKey(prev => prev + 1)
  }

  const runRustCode = (challengeId, codeToRun) => {
    const outputs = []
    outputs.push("   Compiling coding_arena v0.1.0 (/sandbox)")
    
    if (challengeId === 'rust-ownership') {
      const isFixed = codeToRun.includes('&s1') || codeToRun.includes('& s1')
      if (isFixed) {
        outputs.push("    Finished dev [unoptimized + debuginfo] target(s) in 0.48s")
        outputs.push("     Running `target/debug/coding_arena`")
        outputs.push("--------------------------------------------------")
        outputs.push("The length of 'Rust Lang' is 9.")
        outputs.push("\n✓ Success! You solved the ownership challenge.")
      } else {
        outputs.push("🔴 error[E0382]: borrow of moved value: `s1`")
        outputs.push("  --> src/main.rs:9:28")
        outputs.push("   |")
        outputs.push("7  |     let s1 = String::from(\"Rust Lang\");")
        outputs.push("   |         -- move occurs because `s1` has type `String`, which does not implement the `Copy` trait")
        outputs.push("8  |     let len = calculate_length(s1);")
        outputs.push("   |                                -- value moved here")
        outputs.push("9  |     print!(\"The length of '{}' is {}.\", s1, len);")
        outputs.push("   |                                         ^^ value borrowed here after move")
        outputs.push("\n💡 Hint: Pass a reference using `&s1` instead of `s1` in calculate_length.")
      }
    } else if (challengeId === 'rust-match') {
      const hasSome = codeToRun.includes('Some')
      const hasNone = codeToRun.includes('None')
      const hasMatch = codeToRun.includes('match')
      
      if (hasSome && hasNone && hasMatch) {
        outputs.push("    Finished dev [unoptimized + debuginfo] target(s) in 0.52s")
        outputs.push("     Running `target/debug/coding_arena`")
        outputs.push("--------------------------------------------------")
        outputs.push("Division succeeded: 5")
        outputs.push("\n✓ Success! You matched the Option enum.")
      } else {
        outputs.push("🔴 error[E0004]: non-exhaustive patterns: `None` not covered")
        outputs.push("  --> src/main.rs:13:5")
        outputs.push("   |")
        outputs.push("13 |     match result {")
        outputs.push("   |           ^^^^^^ pattern `None` not covered")
        outputs.push("   |")
        outputs.push("💡 Hint: Implement both `Some(value) => ...` and `None => ...` cases inside the match block.")
      }
    } else if (challengeId === 'rust-struct-traits') {
      const hasImpl = codeToRun.includes('impl Summary for NewsArticle')
      const hasSummarize = codeToRun.includes('fn summarize')
      
      if (hasImpl && hasSummarize) {
        outputs.push("    Finished dev [unoptimized + debuginfo] target(s) in 0.65s")
        outputs.push("     Running `target/debug/coding_arena`")
        outputs.push("--------------------------------------------------")
        outputs.push("Summary: Rust 1.78 Released! by Sachin")
        outputs.push("\n✓ Success! You implemented the Summary trait successfully.")
      } else {
        outputs.push("🔴 error[E0277]: the trait bound `NewsArticle: Summary` is not satisfied")
        outputs.push("  --> src/main.rs:24:37")
        outputs.push("   |")
        outputs.push("24 |     print!(\"Summary: {}\", article.summarize());")
        outputs.push("   |                                   ^^^^^^^^^ method cannot be called on `NewsArticle` due to unsatisfied trait bounds")
        outputs.push("   |")
        outputs.push("💡 Hint: Write `impl Summary for NewsArticle { fn summarize(&self) -> String { ... } }` in the code editor.")
      }
    }

    setTerminalLogs(outputs)
  }

  const runBackendCode = (codeToRun) => {
    const outputs = []
    
    const print = (...args) => {
      const msg = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ')
      outputs.push(msg)
    }

    try {
      const originalConsoleLog = console.log
      console.log = (...args) => {
        const msg = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ')
        outputs.push(msg)
        originalConsoleLog.apply(console, args)
      }

      const runner = new Function('print', 'console', codeToRun)
      runner(print, console)

      console.log = originalConsoleLog

      if (outputs.length === 0) {
        outputs.push("✓ Run succeeded with no outputs. (Use print() or console.log() to print to this terminal)")
      }
    } catch (err) {
      outputs.push(`🔴 Execution Error: ${err.message}`)
      if (err.stack) {
        const lines = err.stack.split('\n')
        if (lines[1]) outputs.push(`   at ${lines[1].trim()}`)
      }
    }

    setTerminalLogs(outputs)
  }

  const runCompleteStackCode = (filesMap) => {
    const outputs = []
    
    const print = (...args) => {
      const msg = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ')
      outputs.push(msg)
    }

    try {
      const originalConsoleLog = console.log
      console.log = (...args) => {
        const msg = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ')
        outputs.push(msg)
        originalConsoleLog.apply(console, args)
      }

      // Mock CommonJS require system
      const modules = {}
      const requireMock = (path) => {
        // Resolve absolute or relative paths
        const cleanPath = path
          .replace(/^\.\//, '')
          .replace(/^\.\.\//, '')
          .replace(/\.js$/, '')
          .replace('controllers/', '')
          .replace('middleware/', '')
          .replace('routes/', '');
        
        if (modules[cleanPath]) {
          return modules[cleanPath].exports;
        }
        throw new Error("Cannot find module '" + path + "'");
      }

      // Initialize all modules in dependency order
      const fileExecutionOrder = [
        { name: 'db', path: 'db.js' },
        { name: 'auth', path: 'middleware/auth.js' },
        { name: 'userController', path: 'controllers/userController.js' },
        { name: 'user', path: 'routes/user.js' },
        { name: 'app', path: 'app.js' }
      ]

      for (const file of fileExecutionOrder) {
        const code = filesMap[file.path]
        if (code === undefined) {
          throw new Error("Missing file source: " + file.path);
        }
        const module = { exports: {} }
        modules[file.name] = module
        
        const fileFunction = new Function('require', 'module', 'exports', 'print', 'console', code)
        fileFunction(requireMock, module, module.exports, print, console)
      }

      // Run App Initialization
      const appModule = modules['app'].exports;
      if (!appModule || typeof appModule.startServer !== 'function') {
        throw new Error("app.js must export an object containing a 'startServer' function.");
      }

      // We run the integration tests asynchronously since database setups mimic async/await timeouts
      (async () => {
        try {
          const appInstance = await appModule.startServer()
          if (!appInstance || typeof appInstance.handleRequest !== 'function') {
            throw new Error("startServer must return an app object containing a 'handleRequest' function.");
          }

          print("\n--- TEST 1: Request profile without authorization header ---");
          const test1 = await appInstance.handleRequest({
            method: 'GET',
            path: '/api/users/profile',
            headers: {}
          })
          print("GET Response Code: " + test1.status)
          print("GET Response Body: " + JSON.stringify(test1.body))

          print("\n--- TEST 2: Checkout with invalid authorization header ---");
          const test2 = await appInstance.handleRequest({
            method: 'POST',
            path: '/api/checkout',
            headers: { 'authorization': 'Bearer invalid-token' },
            body: { itemId: 'note_1', amount: 49.00, itemName: 'Clean Architecture Course' }
          })
          print("POST Response Code: " + test2.status)
          print("POST Response Body: " + JSON.stringify(test2.body))

          print("\n--- TEST 3: Successful checkout with correct JWT ---");
          const test3 = await appInstance.handleRequest({
            method: 'POST',
            path: '/api/checkout',
            headers: { 'authorization': 'Bearer sachin-jwt-secret-key' },
            body: { itemId: 'note_1', amount: 49.00, itemName: 'Clean Architecture Course' }
          })
          print("POST Response Code: " + test3.status)
          print("POST Response Body: " + JSON.stringify(test3.body))

          print("\n--- TEST 4: Checkout transaction validation (Insufficient Balance) ---");
          const test4 = await appInstance.handleRequest({
            method: 'POST',
            path: '/api/checkout',
            headers: { 'authorization': 'Bearer sachin-jwt-secret-key' },
            body: { itemId: 'note_2', amount: 300.00, itemName: 'Distributed Systems Course' }
          })
          print("POST Response Code: " + test4.status)
          print("POST Response Body: " + JSON.stringify(test4.body))

          print("\n✓ Full Stack Integration Suite complete! All routes check out.");
          setTerminalLogs(outputs)
        } catch (err) {
          outputs.push("🔴 Simulation Runtime Error: " + err.message)
          setTerminalLogs([...outputs])
        }
      })()

      console.log = originalConsoleLog
    } catch (err) {
      outputs.push("🔴 Module Compilation Error: " + err.message)
      if (err.stack) {
        const lines = err.stack.split('\n')
        if (lines[1]) outputs.push("   at " + lines[1].trim())
      }
      setTerminalLogs(outputs)
    }
  }

  const [searchQuery, setSearchQuery] = useState('')
  const [newTodoText, setNewTodoText] = useState('')
  const [selectedSubject, setSelectedSubject] = useState('All')
  const [message, setMessage] = useState(null)

  // --- VOCAB & PHRASE HUB STATE ---
  const [vocabList, setVocabList] = useState(() => {
    const saved = localStorage.getItem('lumina_vocab')
    return saved ? JSON.parse(saved) : initialVocabulary
  })
  const [vocabWord, setVocabWord] = useState('')
  const [vocabCategory, setVocabCategory] = useState('Coding Term')
  const [vocabPartOfSpeech, setVocabPartOfSpeech] = useState('Noun')
  const [vocabDifficulty, setVocabDifficulty] = useState('Medium')
  const [vocabDefinition, setVocabDefinition] = useState('')
  const [vocabExample, setVocabExample] = useState('')
  const [vocabCodeContext, setVocabCodeContext] = useState('')
  const [vocabMnemonic, setVocabMnemonic] = useState('')
  const [vocabSearch, setVocabSearch] = useState('')
  const [vocabFilterCategory, setVocabFilterCategory] = useState('All')
  const [vocabFilterDifficulty, setVocabFilterDifficulty] = useState('All')
  const [vocabFilterStatus, setVocabFilterStatus] = useState('All')
  const [vocabMessage, setVocabMessage] = useState(null)
  const [vocabImage, setVocabImage] = useState(null)

  // Flashcards state
  const [activeCardIndex, setActiveCardIndex] = useState(0)
  const [isCardFlipped, setIsCardFlipped] = useState(false)
  
  // Expanded word card IDs
  const [expandedCardIds, setExpandedCardIds] = useState([])

  // Edit Word State
  const [editingWordId, setEditingWordId] = useState(null)
  const [editFields, setEditFields] = useState({})

  // Dynamically compute subjects from current notes
  const uniqueSubjects = useMemo(() => {
    const subs = new Set()
    notes.forEach((n) => {
      if (n.subject) subs.add(n.subject)
    })
    subjectSuggestions.forEach(s => {
      if (subs.size < 8) subs.add(s)
    })
    return Array.from(subs)
  }, [notes])

  // --- KNOWLEDGE NOTES FUNCTIONS ---
  const updateNote = async (id, updatedFields) => {
    // Instantly update local UI state for snappy interaction
    const updatedNotes = notes.map((note) => {
      if (note._id === id || note.id === id) {
        return { ...note, ...updatedFields }
      }
      return note
    })
    setNotes(updatedNotes)

    try {
      await api.updateNote(id, updatedFields)
    } catch (err) {
      console.error('Error saving note updates:', err)
    }
  }

  const handleCreateNewNote = async () => {
    try {
      const newNoteData = {
        title: 'Untitled Note',
        subject: selectedSubject !== 'All' ? selectedSubject : 'Software Engineering',
        content: '',
        todos: [],
        images: []
      }
      const res = await api.createNote(newNoteData)
      const createdNote = res.data
      setNotes([createdNote, ...notes])
      setActiveNoteId(createdNote._id)
      setMessage('New note created!')
      setTimeout(() => setMessage(null), 2000)
    } catch (err) {
      console.error('Error creating note:', err)
      setMessage('Failed to create new note.')
      setTimeout(() => setMessage(null), 3000)
    }
  }

  const handleDeleteNote = async (id) => {
    try {
      await api.deleteNote(id)
      const updatedNotes = notes.filter((n) => n._id !== id && n.id !== id)
      setNotes(updatedNotes)
      
      parseNoteWealth(id, '').catch((err) => console.error(err))
      parseNoteHealth(id, '').catch((err) => console.error(err))

      if (activeNoteId === id) {
        // Find the next note from the filtered list (excluding the deleted note)
        const remainingFiltered = updatedNotes.filter((n) => {
          const matchesSubject = selectedSubject === 'All' || n.subject === selectedSubject
          const matchesQuery = n.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                               (n.content && n.content.toLowerCase().includes(searchQuery.toLowerCase()))
          return matchesSubject && matchesQuery
        })
        if (remainingFiltered.length > 0) {
          setActiveNoteId(remainingFiltered[0]._id || remainingFiltered[0].id)
        } else {
          setActiveNoteId(null)
        }
      }

      setMessage('Note deleted.')
      setTimeout(() => setMessage(null), 3000)
    } catch (err) {
      console.error('Error deleting note:', err)
      setMessage('Failed to delete note.')
      setTimeout(() => setMessage(null), 3000)
    }
  }

  const handleLoadTemplate = (type) => {
    if (!activeNoteId) return
    let contentVal = ''
    let defaultTitle = ''
    let defaultSubject = 'Software Engineering'

    if (type === 'website') {
      contentVal = noteTemplates.websitePlan
      defaultTitle = 'New Website Architecture Plan'
      defaultSubject = 'System Design'
    } else if (type === 'business') {
      contentVal = noteTemplates.businessModel
      defaultTitle = 'New Project Monetization Plan'
      defaultSubject = 'Product Design'
    } else if (type === 'project') {
      contentVal = noteTemplates.projectPlanning
      defaultTitle = 'Project Roadmap & Milestone Plan'
      defaultSubject = 'Software Engineering'
    }

    updateNote(activeNoteId, {
      title: defaultTitle,
      subject: defaultSubject,
      content: contentVal
    })
  }

  const handleSyncNoteVaults = (note) => {
    if (!note) return
    parseNoteWealth(note._id || note.id, note.content || '')
      .then(() => parseNoteHealth(note._id || note.id, note.content || ''))
      .then(() => {
        setMessage('Note synced to Wealth & Health Vaults!')
        setTimeout(() => setMessage(null), 3000)
      })
      .catch((err) => {
        console.error(err)
        setMessage('Sync completed with warnings.')
        setTimeout(() => setMessage(null), 3000)
      })
  }

  // Checklist helper functions
  const handleAddTodo = (noteId) => {
    if (!newTodoText.trim()) return
    const activeNote = notes.find((n) => n._id === noteId || n.id === noteId)
    if (!activeNote) return

    const newTodo = {
      id: Date.now().toString(),
      text: newTodoText.trim(),
      completed: false
    }

    const updatedTodos = [...(activeNote.todos || []), newTodo]
    updateNote(noteId, { todos: updatedTodos })
    setNewTodoText('')
  }

  const handleToggleTodo = (noteId, todoId) => {
    const activeNote = notes.find((n) => n._id === noteId || n.id === noteId)
    if (!activeNote) return

    const updatedTodos = (activeNote.todos || []).map((t) =>
      t.id === todoId ? { ...t, completed: !t.completed } : t
    )
    updateNote(noteId, { todos: updatedTodos })
  }

  const handleDeleteTodo = (noteId, todoId) => {
    const activeNote = notes.find((n) => n._id === noteId || n.id === noteId)
    if (!activeNote) return

    const updatedTodos = (activeNote.todos || []).filter((t) => t.id !== todoId)
    updateNote(noteId, { todos: updatedTodos })
  }

  const filteredNotes = notes.filter((n) => {
    const matchesSubject = selectedSubject === 'All' || n.subject === selectedSubject
    const matchesQuery = n.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         (n.content && n.content.toLowerCase().includes(searchQuery.toLowerCase()))
    return matchesSubject && matchesQuery
  })

  // --- VOCAB & PHRASE HUB FUNCTIONS ---
  const handleSaveVocabList = (updated) => {
    setVocabList(updated)
    localStorage.setItem('lumina_vocab', JSON.stringify(updated))
  }

  const handleCreateVocab = (e) => {
    e.preventDefault()
    if (!vocabWord.trim() || !vocabDefinition.trim()) {
      setVocabMessage('Please enter the word/phrase and its definition.')
      return
    }

    const newItem = {
      id: Date.now(),
      word: vocabWord.trim(),
      category: vocabCategory,
      partOfSpeech: vocabPartOfSpeech,
      difficulty: vocabDifficulty,
      definition: vocabDefinition.trim(),
      example: vocabExample.trim(),
      codeContext: vocabCodeContext.trim(),
      mnemonic: vocabMnemonic.trim(),
      image: vocabImage || null,
      status: 'learning'
    }

    const updated = [newItem, ...vocabList]
    handleSaveVocabList(updated)

    // Reset Form
    setVocabWord('')
    setVocabDefinition('')
    setVocabExample('')
    setVocabCodeContext('')
    setVocabMnemonic('')
    setVocabImage(null)
    setVocabMessage('Word added to vault!')
    setTimeout(() => setVocabMessage(null), 3000)
  }

  const handleDeleteVocab = (id) => {
    const updated = vocabList.filter(v => v.id !== id)
    handleSaveVocabList(updated)
    setVocabMessage('Word deleted.')
    setTimeout(() => setVocabMessage(null), 3000)

    // Adjust flashcard index if out of bounds
    if (activeCardIndex >= learningWords.length - 1 && activeCardIndex > 0) {
      setActiveCardIndex(prev => Math.max(0, prev - 1))
      setIsCardFlipped(false)
    }
  }

  const toggleVocabStatus = (id) => {
    const updated = vocabList.map(v => {
      if (v.id === id) {
        return { ...v, status: v.status === 'learning' ? 'mastered' : 'learning' }
      }
      return v
    })
    handleSaveVocabList(updated)
  }

  const importDeveloperPack = () => {
    // Merge pack without duplicates
    const existingWords = new Set(vocabList.map(v => v.word.toLowerCase()))
    const newItems = initialVocabulary.filter(item => !existingWords.has(item.word.toLowerCase()))

    if (newItems.length === 0) {
      setVocabMessage('Developer Pack is already imported!')
      setTimeout(() => setVocabMessage(null), 3000)
      return
    }

    // Add unique ones
    const updated = [...vocabList, ...newItems.map(item => ({ ...item, id: Date.now() + Math.random() }))]
    handleSaveVocabList(updated)
    setVocabMessage(`Successfully imported ${newItems.length} developer vocabulary words!`)
    setTimeout(() => setVocabMessage(null), 3000)
  }

  const resetAllMastered = () => {
    const updated = vocabList.map(v => ({ ...v, status: 'learning' }))
    handleSaveVocabList(updated)
    setActiveCardIndex(0)
    setIsCardFlipped(false)
    setVocabMessage('Reset all words to Learning mode.')
    setTimeout(() => setVocabMessage(null), 3000)
  }

  // Flashcards filtered list (only words in 'learning' status)
  const learningWords = useMemo(() => {
    return vocabList.filter(v => v.status === 'learning')
  }, [vocabList])

  const handleFlashcardReview = (mastered) => {
    if (learningWords.length === 0) return

    const currentWord = learningWords[activeCardIndex]
    if (mastered) {
      toggleVocabStatus(currentWord.id)
    }

    setIsCardFlipped(false)
    
    // Smooth transition delay to next card
    setTimeout(() => {
      if (activeCardIndex >= learningWords.length - 1 || mastered) {
        // If we mastered the word, the list shrinks, so index handles itself or wraps
        setActiveCardIndex(0)
      } else {
        setActiveCardIndex(prev => prev + 1)
      }
    }, 250)
  }

  // Expanded card toggle
  const toggleExpandCard = (id) => {
    if (expandedCardIds.includes(id)) {
      setExpandedCardIds(expandedCardIds.filter(cid => cid !== id))
    } else {
      setExpandedCardIds([...expandedCardIds, id])
    }
  }

  // Edit Mode functions
  const startEditing = (word) => {
    setEditingWordId(word.id)
    setEditFields({ ...word })
  }

  const saveEditing = () => {
    const updated = vocabList.map(v => {
      if (v.id === editingWordId) {
        return { ...editFields }
      }
      return v
    })
    handleSaveVocabList(updated)
    setEditingWordId(null)
    setVocabMessage('Word details updated.')
    setTimeout(() => setVocabMessage(null), 3000)
  }

  const handleImagePaste = (e, setter) => {
    const items = Array.from(e.clipboardData.items)
    const imageItem = items.find(item => item.type.startsWith('image/'))
    if (!imageItem) return
    e.preventDefault()
    const blob = imageItem.getAsFile()
    const reader = new FileReader()
    reader.onload = (evt) => setter(evt.target.result)
    reader.readAsDataURL(blob)
  }

  const handleNoteImagePaste = (noteId, e) => {
    const items = Array.from(e.clipboardData.items)
    const imageItem = items.find(item => item.type.startsWith('image/'))
    if (!imageItem) return
    e.preventDefault()
    const note = notes.find(n => n._id === noteId || n.id === noteId)
    if (!note) return
    const blob = imageItem.getAsFile()
    const reader = new FileReader()
    reader.onload = (evt) => {
      const imgId = `img_${Date.now()}`
      const images = [...(note.images || []), { id: imgId, src: evt.target.result }]
      
      // Get cursor position in textarea
      const textarea = e.target
      const selectionStart = textarea.selectionStart
      const selectionEnd = textarea.selectionEnd
      const text = note.content || ''
      
      const imageTag = `\n![Pasted Image](${imgId})\n`
      const newContent = text.substring(0, selectionStart) + imageTag + text.substring(selectionEnd)
      
      updateNote(noteId, { 
        content: newContent,
        images 
      })

      // Position the cursor after the inserted tag
      setTimeout(() => {
        textarea.focus()
        const newCursorPos = selectionStart + imageTag.length
        textarea.setSelectionRange(newCursorPos, newCursorPos)
      }, 0)
    }
    reader.readAsDataURL(blob)
  }

  // Filters and search for the Dictionary List
  const filteredVocab = useMemo(() => {
    return vocabList.filter(v => {
      const matchesSearch = v.word.toLowerCase().includes(vocabSearch.toLowerCase()) ||
                            v.definition.toLowerCase().includes(vocabSearch.toLowerCase()) ||
                            (v.codeContext && v.codeContext.toLowerCase().includes(vocabSearch.toLowerCase()))
      
      const matchesCategory = vocabFilterCategory === 'All' || v.category === vocabFilterCategory
      const matchesDifficulty = vocabFilterDifficulty === 'All' || v.difficulty === vocabFilterDifficulty
      const matchesStatus = vocabFilterStatus === 'All' || v.status === vocabFilterStatus

      return matchesSearch && matchesCategory && matchesDifficulty && matchesStatus
    })
  }, [vocabList, vocabSearch, vocabFilterCategory, vocabFilterDifficulty, vocabFilterStatus])

  return (
    <div className="space-y-6 text-slate-200">
      {/* Header Banner with Custom Tab Toggles */}
      <div className="rounded-3xl border border-slate-800 bg-slate-950/90 p-6 shadow-lg shadow-slate-950/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 tracking-tight flex items-center gap-2">
            <span>📚</span>
            <span>Knowledge Vault</span>
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            {activeTab === 'notes' 
              ? 'Write documentation, log design guides, and compile concepts for future reference.' 
              : activeTab === 'vocab'
              ? 'Add specialized coding phrases & English vocabulary. Review them via flashcards to memorize easily.'
              : 'Practice your coding skills client-side. Select a challenge, write code, and run or preview it live!'
            }
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex flex-wrap sm:flex-nowrap bg-slate-900 border border-slate-800 p-1.5 rounded-2xl self-stretch md:self-auto select-none w-full md:w-auto gap-1 sm:gap-0">
          <button
            type="button"
            onClick={() => setActiveTab('notes')}
            className={`flex-1 md:flex-initial flex items-center justify-center gap-2 px-3 sm:px-4 py-2 text-[10px] sm:text-xs font-bold rounded-xl transition duration-150 ${
              activeTab === 'notes'
                ? 'bg-purple-600/20 border border-purple-500/35 text-purple-300 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 border border-transparent'
            }`}
          >
            <span>📝</span> Notes Vault
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('vocab')}
            className={`flex-1 md:flex-initial flex items-center justify-center gap-2 px-3 sm:px-4 py-2 text-[10px] sm:text-xs font-bold rounded-xl transition duration-150 ${
              activeTab === 'vocab'
                ? 'bg-purple-600/20 border border-purple-500/35 text-purple-300 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 border border-transparent'
            }`}
          >
            <span>🗣️</span> Vocab Hub
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('coding')}
            className={`flex-1 md:flex-initial flex items-center justify-center gap-2 px-3 sm:px-4 py-2 text-[10px] sm:text-xs font-bold rounded-xl transition duration-150 ${
              activeTab === 'coding'
                ? 'bg-purple-600/20 border border-purple-500/35 text-purple-300 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 border border-transparent'
            }`}
          >
            <span>💻</span> Coding Arena
          </button>
        </div>
      </div>

      {/* RENDER ACTIVE TAB */}
      {activeTab === 'notes' ? (
        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          {/* LEFT COLUMN: NOTES SIDEBAR */}
          <div className={`space-y-4 rounded-3xl border border-slate-800 bg-slate-950/90 p-5 shadow-lg flex flex-col h-[750px] ${activeNoteId !== null ? 'hidden lg:flex' : 'flex'}`}>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Pages</h3>
              <button
                type="button"
                onClick={handleCreateNewNote}
                className="rounded-lg bg-purple-600/20 border border-purple-500/35 hover:bg-purple-600/30 px-2 py-1 text-[10px] font-bold text-purple-300 transition"
              >
                + Create
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-900 pl-3 pr-8 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500"
                placeholder="Search notes..."
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2.5 text-xs text-slate-500 hover:text-slate-300"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Subject Filters */}
            <div className="space-y-1">
              <span className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Filter Topic</span>
              <select
                value={selectedSubject}
                onChange={(e) => {
                  const val = e.target.value
                  setSelectedSubject(val)
                  // Auto-switch active note to the first matching note in the filtered list
                  const matches = notes.filter((n) => {
                    const matchesSubject = val === 'All' || n.subject === val
                    const matchesQuery = n.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                         (n.content && n.content.toLowerCase().includes(searchQuery.toLowerCase()))
                    return matchesSubject && matchesQuery
                  })
                  if (matches.length > 0) {
                    setActiveNoteId(matches[0]._id || matches[0].id)
                  } else {
                    setActiveNoteId(null)
                  }
                }}
                className="w-full rounded-xl border border-slate-750 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
              >
                <option value="All">All Topics</option>
                {uniqueSubjects.map((sub) => (
                  <option key={sub} value={sub}>{sub}</option>
                ))}
              </select>
            </div>

            {/* Note List Scroll Container */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 animate-fade-in">
              {notesLoading ? (
                <div className="text-center text-xs text-slate-500 py-12 bg-slate-900/10 rounded-2xl border border-dashed border-slate-800 space-y-2 select-none">
                  <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <span>Syncing with Database...</span>
                </div>
              ) : filteredNotes.length === 0 ? (
                <div className="text-center text-xs text-slate-500 py-8 bg-slate-900/10 rounded-2xl border border-dashed border-slate-800">
                  No notes found
                </div>
              ) : (
                filteredNotes.map((note) => {
                  const isActive = activeNoteId === note._id || activeNoteId === note.id
                  return (
                    <div
                      key={note._id || note.id}
                      onClick={() => setActiveNoteId(note._id || note.id)}
                      className={`group cursor-pointer rounded-2xl p-3 border transition flex items-center justify-between ${
                        isActive
                          ? 'bg-purple-950/40 border-purple-500/40 text-white'
                          : 'border-transparent bg-slate-900/30 text-slate-300 hover:bg-slate-900/60 hover:text-white'
                      }`}
                    >
                      <div className="flex-1 min-w-0 pr-2">
                        <div className="text-xs font-bold truncate">
                          {note.title || 'Untitled Note'}
                        </div>
                        <div className="text-[9px] text-slate-500 truncate mt-0.5">
                          {note.subject}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteNote(note._id || note.id)
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded-lg border border-rose-500/20 bg-rose-500/10 text-rose-350 hover:bg-rose-500/20 transition-opacity"
                        title="Delete Page"
                      >
                        🗑️
                      </button>
                    </div>
                  )
                })
              )}
            </div>

            {message && (
              <div className="rounded-xl border border-purple-500/20 bg-purple-950/30 p-2.5 text-[10px] text-purple-200 text-center animate-fade-in">
                {message}
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: WORKSPACE */}
          <div className={`h-auto lg:h-[750px] animate-fade-in ${activeNoteId !== null ? 'block' : 'hidden lg:block'}`}>
            {(() => {
              const activeNote = notes.find((n) => n._id === activeNoteId || n.id === activeNoteId)
              
              if (!activeNote) {
                return (
                  <div className="flex flex-col items-center justify-center text-center p-8 rounded-3xl border border-slate-800 bg-slate-950/50 h-full space-y-4">
                    <div className="w-16 h-16 rounded-full bg-purple-900/20 border border-purple-500/20 flex items-center justify-center text-3xl">
                      📓
                    </div>
                    <div className="max-w-md">
                      <h3 className="text-base font-bold text-slate-100">Lumina Knowledge Workspace</h3>
                      <p className="text-xs text-slate-400 mt-1">
                        Select a document from the left list to begin writing product specs, system roadmaps, or notes.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleCreateNewNote}
                      className="rounded-2xl bg-gradient-to-r from-purple-500 to-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-purple-500/15 hover:from-purple-600 hover:to-indigo-700 transition"
                    >
                      Create New Page
                    </button>

                    {/* Tip cards */}
                    <div className="grid grid-cols-2 gap-4 max-w-lg mt-8 text-left">
                      <div className="p-3.5 rounded-2xl border border-slate-800 bg-slate-900/30">
                        <span className="text-xs font-bold text-slate-300">💡 Pro Tip</span>
                        <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                          Add ledger transactions inside your notes (e.g. <code>[earning: 10 | cat: Sale]</code>) and click Sync to sync with the Wealth Vault.
                        </p>
                      </div>
                      <div className="p-3.5 rounded-2xl border border-slate-800 bg-slate-900/30">
                        <span className="text-xs font-bold text-slate-300">📝 Interactive checklists</span>
                        <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                          Every document includes a sidebar task manager to track milestone checklist statuses automatically.
                        </p>
                      </div>
                    </div>
                  </div>
                )
              }

              // Compute Checklist details
              const todos = activeNote.todos || []
              const completedCount = todos.filter((t) => t.completed).length
              const totalCount = todos.length
              const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

              return (
                <div className="flex flex-col h-full space-y-4">
                  {/* Workspace Actions Toolbar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-3xl border border-slate-800 bg-slate-950/90 shadow-md">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setActiveNoteId(null)}
                        className="text-xs px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-355 hover:text-white transition"
                      >
                        ← Close
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSyncNoteVaults(activeNote)}
                        className="text-[10px] font-bold px-3 py-1.5 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white rounded-xl shadow shadow-purple-500/10 transition"
                        title="Sync transactions and protein tracker data from this note to main vaults"
                      >
                        Sync Vaults ⚡
                      </button>
                    </div>

                    {/* Sub-tab controls for screens below xl breakpoint */}
                    <div className="flex xl:hidden bg-slate-900 border border-slate-850 p-1 rounded-xl select-none">
                      <button
                        type="button"
                        onClick={() => setWorkspaceSubTab('doc')}
                        className={`px-3 py-1.5 text-[10px] font-bold rounded-lg transition duration-150 flex items-center gap-1 ${
                          workspaceSubTab === 'doc'
                            ? 'bg-purple-600/20 border border-purple-500/30 text-purple-300'
                            : 'text-slate-400 hover:text-slate-200 border border-transparent'
                        }`}
                      >
                        <span>📝</span> Document
                      </button>
                      <button
                        type="button"
                        onClick={() => setWorkspaceSubTab('checklist')}
                        className={`px-3 py-1.5 text-[10px] font-bold rounded-lg transition duration-150 flex items-center gap-1 ${
                          workspaceSubTab === 'checklist'
                            ? 'bg-purple-600/20 border border-purple-500/30 text-purple-300'
                            : 'text-slate-400 hover:text-slate-200 border border-transparent'
                        }`}
                      >
                        <span>📋</span> Checklist {totalCount > 0 && `(${completedCount}/${totalCount})`}
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5 select-none text-[9px] font-bold">
                      <span className="text-slate-550 uppercase tracking-wide mr-1">Load Template:</span>
                      <button
                        type="button"
                        onClick={() => handleLoadTemplate('website')}
                        className="rounded-lg bg-slate-900 border border-slate-800 hover:border-purple-500/20 px-2 py-1 text-slate-300 hover:text-purple-300 transition"
                      >
                        🌐 Web Plan
                      </button>
                      <button
                        type="button"
                        onClick={() => handleLoadTemplate('business')}
                        className="rounded-lg bg-slate-900 border border-slate-800 hover:border-purple-500/20 px-2 py-1 text-slate-300 hover:text-purple-300 transition"
                      >
                        💼 Business
                      </button>
                      <button
                        type="button"
                        onClick={() => handleLoadTemplate('project')}
                        className="rounded-lg bg-slate-900 border border-slate-800 hover:border-purple-500/20 px-2 py-1 text-slate-300 hover:text-purple-300 transition"
                      >
                        📋 Roadmap
                      </button>
                    </div>
                  </div>

                  {/* Split Workspace Panels */}
                  <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 flex-1 min-h-0">
                    {/* Document Panel */}
                    <div className={`xl:col-span-7 flex flex-col rounded-3xl border border-slate-800 bg-slate-950/90 p-5 shadow-lg min-h-[500px] xl:min-h-0 ${workspaceSubTab === 'doc' ? 'flex' : 'hidden xl:flex'}`}>
                      {/* Title input */}
                      <input
                        value={activeNote.title || ''}
                        onChange={(e) => updateNote(activeNote._id || activeNote.id, { title: e.target.value })}
                        className="w-full bg-transparent border-b border-transparent hover:border-slate-800 focus:border-purple-500/30 text-xl font-black text-slate-100 focus:outline-none py-1 mb-2"
                        placeholder="Untitled Note"
                      />

                      {/* Subject dropdown & Workspace Mode Toggle */}
                      <div className="flex items-center justify-between mt-1 gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-500 font-bold uppercase">Topic:</span>
                          <input
                            list="note-subject-suggestions-workspace"
                            value={activeNote.subject || ''}
                            onChange={(e) => updateNote(activeNote._id || activeNote.id, { subject: e.target.value })}
                            className="bg-slate-900 border border-slate-850 hover:border-slate-700 text-xs px-2.5 py-1 rounded-xl text-slate-355 focus:outline-none focus:border-purple-500"
                            placeholder="Select or type a topic"
                          />
                          <datalist id="note-subject-suggestions-workspace">
                            {subjectSuggestions.map((s) => (
                              <option key={s} value={s} />
                            ))}
                          </datalist>
                        </div>

                        <div className="flex bg-slate-900 border border-slate-850 p-1 rounded-xl select-none">
                          <button
                            type="button"
                            onClick={() => setWorkspaceMode('edit')}
                            className={`px-3 py-1.5 text-[10px] font-bold rounded-lg transition duration-150 flex items-center gap-1 ${
                              workspaceMode === 'edit'
                                ? 'bg-purple-600/20 border border-purple-500/30 text-purple-300'
                                : 'text-slate-400 hover:text-slate-200 border border-transparent'
                            }`}
                          >
                            <span>📝</span> Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => setWorkspaceMode('preview')}
                            className={`px-3 py-1.5 text-[10px] font-bold rounded-lg transition duration-150 flex items-center gap-1 ${
                              workspaceMode === 'preview'
                                ? 'bg-purple-600/20 border border-purple-500/30 text-purple-300'
                                : 'text-slate-400 hover:text-slate-200 border border-transparent'
                            }`}
                          >
                            <span>👁️</span> Preview
                          </button>
                        </div>
                      </div>

                      {/* Document Draft content */}
                      {workspaceMode === 'edit' ? (
                        <textarea
                          value={activeNote.content || ''}
                          onChange={(e) => updateNote(activeNote._id || activeNote.id, { content: e.target.value })}
                          onPaste={(e) => handleNoteImagePaste(activeNote._id || activeNote.id, e)}
                          className="w-full flex-1 mt-4 bg-transparent resize-none border-0 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none leading-relaxed overflow-y-auto pr-1 border-t border-slate-800 pt-3"
                          placeholder="Write about the project planning, system designs, or details (Supports basic Markdown tags like ### headers and - bullet lists)..."
                        />
                      ) : (
                        <div className="w-full flex-1 mt-4 overflow-y-auto pr-1 border-t border-slate-800 pt-3 space-y-2 select-text">
                          {renderMarkdown(activeNote.content || '', activeNote.images || [], setLightboxImage)}
                        </div>
                      )}

                      {/* Pasted Images Gallery */}
                      {workspaceMode === 'edit' && (activeNote.images || []).length > 0 && (
                        <div className="mt-2 pt-2.5 border-t border-slate-800 space-y-1.5 flex-shrink-0">
                          <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-500">Pasted Images Gallery</span>
                          <div className="flex flex-row overflow-x-auto gap-2 py-1.5 px-1 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
                            {(activeNote.images || []).map((img) => (
                              <div key={img.id} className="relative group/img flex-shrink-0">
                                <img
                                  src={img.src}
                                  alt=""
                                  className="h-16 w-auto max-w-[120px] rounded-xl border border-slate-800 object-cover cursor-pointer hover:border-purple-500/30 transition shadow-sm"
                                  onClick={() => setLightboxImage(img.src)}
                                  title="Click to view full size"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = (activeNote.images || []).filter(i => i.id !== img.id)
                                    const cleanedContent = (activeNote.content || '').replaceAll(`![Pasted Image](${img.id})`, '')
                                    updateNote(activeNote._id || activeNote.id, { 
                                      images: updated,
                                      content: cleanedContent 
                                    })
                                  }}
                                  className="absolute -top-1.5 -right-1.5 opacity-0 group-hover/img:opacity-100 bg-rose-500 hover:bg-rose-600 text-white rounded-full w-4 h-4 text-[9px] flex items-center justify-center transition shadow-md"
                                >
                                  ✕
                                </button>
                              </div>
                            ))}
                          </div>
                          <p className="text-[8px] text-slate-600">Paste more images with Ctrl+V / Cmd+V in the text area above</p>
                        </div>
                      )}
                    </div>

                    {/* Interactive Checklist Panel */}
                    <div className={`xl:col-span-5 flex flex-col rounded-3xl border border-slate-800 bg-slate-950/90 p-5 shadow-lg min-h-[400px] xl:min-h-0 ${workspaceSubTab === 'checklist' ? 'flex' : 'hidden xl:flex'}`}>
                      <div className="border-b border-slate-800 pb-3 mb-3 flex items-center justify-between">
                        <div>
                          <h4 className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Roadmap Checklist</h4>
                          <span className="text-[9px] text-slate-500 mt-0.5">Toggle milestones and project checklist items</span>
                        </div>
                        {totalCount > 0 && (
                          <span className="text-[10px] bg-slate-900 border border-slate-855 px-2 py-0.5 rounded-full text-slate-400 font-bold">
                            {completedCount}/{totalCount} Completed
                          </span>
                        )}
                      </div>

                      {/* Progress Bar */}
                      {totalCount > 0 && (
                        <div className="mb-4 space-y-1.5 select-none">
                          <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-purple-500 to-indigo-600 transition-all duration-300"
                              style={{ width: `${progressPercent}%` }}
                            />
                          </div>
                          <div className="flex justify-between items-center text-[9px] text-slate-500 font-bold">
                            <span>PROGRESS</span>
                            <span>{progressPercent}%</span>
                          </div>
                        </div>
                      )}

                      {/* Add new milestone task form */}
                      <form
                        onSubmit={(e) => {
                          e.preventDefault()
                          handleAddTodo(activeNote._id || activeNote.id)
                        }}
                        className="flex gap-2 mb-4"
                      >
                        <input
                          value={newTodoText}
                          onChange={(e) => setNewTodoText(e.target.value)}
                          className="flex-1 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500"
                          placeholder="Add a milestone task..."
                        />
                        <button
                          type="submit"
                          className="rounded-xl bg-purple-600/20 border border-purple-500/30 hover:bg-purple-600/30 text-purple-300 font-bold px-3 py-2 text-xs transition"
                        >
                          +
                        </button>
                      </form>

                      {/* Task Checklist Items */}
                      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                        {todos.length === 0 ? (
                          <div className="flex flex-col items-center justify-center text-center py-16 text-slate-500 space-y-2 bg-slate-900/10 border border-dashed border-slate-850 rounded-2xl">
                            <span className="text-2xl">📋</span>
                            <p className="text-[10px] max-w-[180px] mx-auto leading-relaxed">No milestones or checklist tasks added to this page yet.</p>
                          </div>
                        ) : (
                          todos.map((todo) => (
                            <div
                              key={todo.id}
                              className="flex items-center justify-between p-2.5 rounded-xl border border-slate-800 bg-slate-900/20 group hover:border-slate-800 hover:bg-slate-900/40 transition"
                            >
                              <label className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0">
                                <input
                                  type="checkbox"
                                  checked={todo.completed}
                                  onChange={() => handleToggleTodo(activeNote._id || activeNote.id, todo.id)}
                                  className="w-3.5 h-3.5 rounded text-purple-600 focus:ring-purple-500 border-slate-700 bg-slate-900 cursor-pointer"
                                />
                                <span className={`text-xs truncate font-medium ${
                                  todo.completed ? 'line-through text-slate-500' : 'text-slate-200'
                                }`}>
                                  {todo.text}
                                </span>
                              </label>
                              <button
                                type="button"
                                onClick={() => handleDeleteTodo(activeNote._id || activeNote.id, todo.id)}
                                className="opacity-0 group-hover:opacity-100 text-[10px] text-rose-455 hover:text-rose-300 px-1.5 py-0.5 rounded transition"
                              >
                                ✕
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })()}
          </div>
        </div>
      ) : activeTab === 'vocab' ? (
        // --- VOCAB & PHRASE HUB VIEW ---
        <div className="grid gap-6 xl:grid-cols-[1.1fr_1.3fr]">
          {/* LEFT COLUMN: Study arena + Add Word Form */}
          <div className="space-y-6">
            
            {/* FLASHCARD PRACTICE ARENA */}
            <section className="rounded-3xl border border-slate-800 bg-slate-950/90 p-6 shadow-lg">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-4">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Flashcard Study Arena</h3>
                  <p className="text-[10px] text-slate-500 mt-0.5">Flip cards and mark words as Mastered</p>
                </div>
                <div className="flex gap-2">
                  {vocabList.some(v => v.status === 'mastered') && (
                    <button
                      type="button"
                      onClick={resetAllMastered}
                      className="rounded-lg bg-slate-900 border border-slate-800 hover:border-purple-500/20 px-2 py-1 text-[9px] font-bold text-slate-300 hover:text-purple-300 transition"
                      title="Reset mastered words to practice again"
                    >
                      🔄 Reset Mastered
                    </button>
                  )}
                  {vocabList.length === 0 && (
                    <button
                      type="button"
                      onClick={importDeveloperPack}
                      className="rounded-lg bg-purple-900/20 border border-purple-500/30 text-purple-300 px-2.5 py-1 text-[9px] font-bold hover:bg-purple-950/40 transition"
                    >
                      🚀 Import Developer Pack
                    </button>
                  )}
                </div>
              </div>

              {learningWords.length === 0 ? (
                <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-8 text-center space-y-4">
                  <div className="text-4xl text-purple-400">🎉</div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-200">No active learning cards!</h4>
                    <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                      All words are either Mastered, or your vault is empty. Click the Developer Pack button or add some words to start!
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={resetAllMastered}
                    className="rounded-xl bg-purple-600/20 border border-purple-500/30 px-4 py-2 text-xs font-bold text-purple-300 hover:bg-purple-600/35 transition"
                  >
                    Practice Mastered Words Again
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Active Card Index */}
                  <div className="flex justify-between items-center text-[10px] text-slate-500">
                    <span className="font-bold uppercase tracking-wider text-purple-400">
                      Card {activeCardIndex + 1} of {learningWords.length}
                    </span>
                    <span className="font-medium bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-full">
                      Deck: Learning Mode
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-1 bg-slate-900 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-purple-500 to-indigo-600 transition-all duration-300"
                      style={{ width: `${((activeCardIndex + 1) / learningWords.length) * 100}%` }}
                    />
                  </div>

                  {/* 3D Flip Flashcard Container */}
                  <div 
                    className="w-full h-72 perspective-1000 cursor-pointer select-none"
                    onClick={() => setIsCardFlipped(!isCardFlipped)}
                  >
                    <div className={`relative w-full h-full duration-500 preserve-3d transition-transform ${isCardFlipped ? 'rotate-y-180' : ''}`}>
                      
                      {/* CARD FRONT FACE */}
                      <div className="absolute inset-0 w-full h-full backface-hidden rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 to-slate-950 p-6 flex flex-col justify-between shadow-xl">
                        <div className="flex justify-between items-start">
                          <span className="text-[10px] bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-full text-slate-400 font-bold uppercase tracking-wider">
                            {learningWords[activeCardIndex].category}
                          </span>
                          <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md ${
                            learningWords[activeCardIndex].difficulty === 'Easy' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                            learningWords[activeCardIndex].difficulty === 'Hard' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                            'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}>
                            {learningWords[activeCardIndex].difficulty}
                          </span>
                        </div>

                        <div className="text-center space-y-2">
                          <h2 className="text-3xl font-black text-slate-100 tracking-tight leading-none">
                            {learningWords[activeCardIndex].word}
                          </h2>
                          <span className="inline-block text-[11px] font-bold italic text-purple-400 bg-purple-500/5 px-2 py-0.5 rounded border border-purple-500/10">
                            {learningWords[activeCardIndex].partOfSpeech}
                          </span>
                        </div>

                        <div className="text-center text-[10px] text-slate-500 font-bold uppercase tracking-widest animate-pulse">
                          👉 Click Card to Flip & Reveal Meaning
                        </div>
                      </div>

                      {/* CARD BACK FACE */}
                      <div className="absolute inset-0 w-full h-full backface-hidden rotate-y-180 rounded-2xl border border-purple-500/20 bg-slate-900 p-6 flex flex-col justify-between shadow-xl overflow-y-auto">
                        <div className="space-y-4">
                          <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                            <span className="text-xs font-extrabold text-slate-100">
                              {learningWords[activeCardIndex].word} <span className="text-[10px] font-bold text-purple-400 italic">({learningWords[activeCardIndex].partOfSpeech})</span>
                            </span>
                            <span className="text-[9px] bg-slate-950 border border-slate-800 px-2 py-0.5 rounded-full text-slate-400 font-bold">
                              {learningWords[activeCardIndex].category}
                            </span>
                          </div>

                          <div className="space-y-3 text-xs">
                            {/* Definition */}
                            <div>
                              <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">Definition</span>
                              <p className="text-slate-200 leading-relaxed font-sans">{learningWords[activeCardIndex].definition}</p>
                            </div>

                            {/* General Example */}
                            <div>
                              <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">General Example</span>
                              <p className="text-slate-350 italic font-sans">"{learningWords[activeCardIndex].example}"</p>
                            </div>

                            {/* Coding Context (Optional) */}
                            {learningWords[activeCardIndex].codeContext && (
                              <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-850">
                                <span className="block text-[9px] font-bold uppercase tracking-wider text-purple-400 mb-1">💻 Coding & Tech Usage</span>
                                <code className="block text-[10px] text-slate-300 font-mono leading-relaxed">{learningWords[activeCardIndex].codeContext}</code>
                              </div>
                            )}

                            {/* Mnemonic / Hook (Optional) */}
                            {learningWords[activeCardIndex].mnemonic && (
                              <div className="border-l-2 border-amber-500/40 pl-2">
                                <span className="block text-[9px] font-bold uppercase tracking-wider text-amber-400 mb-0.5">🧠 Memory Hack</span>
                                <p className="text-slate-350 font-sans italic text-[11px]">{learningWords[activeCardIndex].mnemonic}</p>
                              </div>
                            )}

                            {/* Visual Reference Image */}
                            {learningWords[activeCardIndex].image && (
                              <div>
                                <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-500 mb-1">🖼️ Visual Reference</span>
                                <img src={learningWords[activeCardIndex].image} alt="Visual reference" className="max-h-28 rounded-xl object-contain border border-slate-800" />
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="text-center text-[9px] text-slate-500 font-bold uppercase mt-2">
                          👉 Click Card to Flip Back
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* Card Assessment Buttons */}
                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleFlashcardReview(false)
                      }}
                      className="flex-1 rounded-2xl border border-slate-800 hover:border-slate-700 bg-slate-950/90 py-3 text-xs font-semibold text-slate-400 hover:text-slate-200 transition"
                    >
                      🔴 Needs Practice
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleFlashcardReview(true)
                      }}
                      className="flex-1 rounded-2xl bg-gradient-to-r from-purple-500 to-indigo-600 py-3 text-xs font-semibold text-white hover:from-purple-600 hover:to-indigo-700 shadow-md shadow-purple-500/10 transition"
                    >
                      🟢 Mastered!
                    </button>
                  </div>
                </div>
              )}
            </section>

            {/* CREATOR FORM */}
            <section className="rounded-3xl border border-slate-800 bg-slate-950/90 p-6 shadow-lg">
              <h3 className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400 border-b border-slate-800 pb-3 mb-4">
                Add Word or Phrase
              </h3>

              <form onSubmit={handleCreateVocab} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label className="block text-xs text-slate-450 font-semibold">
                    Word / Phrase *
                    <input
                      required
                      value={vocabWord}
                      onChange={(e) => setVocabWord(e.target.value)}
                      className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-xs text-slate-100 placeholder-slate-550 focus:outline-none focus:border-purple-500"
                      placeholder="e.g. Mitigate"
                    />
                  </label>

                  <label className="block text-xs text-slate-450 font-semibold">
                    Part of Speech
                    <select
                      value={vocabPartOfSpeech}
                      onChange={(e) => setVocabPartOfSpeech(e.target.value)}
                      className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-purple-500"
                    >
                      <option value="Noun">Noun</option>
                      <option value="Verb">Verb</option>
                      <option value="Adjective">Adjective</option>
                      <option value="Adverb">Adverb</option>
                      <option value="Phrase">Phrase</option>
                      <option value="Idiom">Idiom</option>
                    </select>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label className="block text-xs text-slate-450 font-semibold">
                    Category Area
                    <select
                      value={vocabCategory}
                      onChange={(e) => setVocabCategory(e.target.value)}
                      className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-purple-500"
                    >
                      <option value="Coding Term">Coding Term</option>
                      <option value="General English">General English</option>
                      <option value="Business Idiom">Business Idiom</option>
                      <option value="Academic">Academic</option>
                    </select>
                  </label>

                  <label className="block text-xs text-slate-450 font-semibold">
                    Difficulty Level
                    <select
                      value={vocabDifficulty}
                      onChange={(e) => setVocabDifficulty(e.target.value)}
                      className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-purple-500"
                    >
                      <option value="Easy">Easy</option>
                      <option value="Medium">Medium</option>
                      <option value="Hard">Hard</option>
                    </select>
                  </label>
                </div>

                <label className="block text-xs text-slate-450 font-semibold">
                  Meaning & Definition *
                  <textarea
                    required
                    value={vocabDefinition}
                    onChange={(e) => setVocabDefinition(e.target.value)}
                    rows={2}
                    className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-xs text-slate-100 placeholder-slate-550 focus:outline-none focus:border-purple-500 font-sans"
                    placeholder="e.g. Make less severe, serious, or painful."
                  />
                </label>

                <label className="block text-xs text-slate-450 font-semibold">
                  General Example Sentence
                  <textarea
                    value={vocabExample}
                    onChange={(e) => setVocabExample(e.target.value)}
                    rows={2}
                    className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-xs text-slate-100 placeholder-slate-550 focus:outline-none focus:border-purple-500 font-sans"
                    placeholder="e.g. We must take measures to mitigate the risk of flooding."
                  />
                </label>

                <label className="block text-xs text-slate-450 font-semibold">
                  Coding Context Example (How do developers use it?)
                  <textarea
                    value={vocabCodeContext}
                    onChange={(e) => setVocabCodeContext(e.target.value)}
                    rows={2}
                    className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-xs text-slate-100 placeholder-slate-550 focus:outline-none focus:border-purple-500 font-mono"
                    placeholder="e.g. We mitigated API response latency by leveraging Redis caching."
                  />
                </label>

                <label className="block text-xs text-slate-450 font-semibold">
                  Memory Hook / Mnemonic Hook (Helps you remember)
                  <input
                    value={vocabMnemonic}
                    onChange={(e) => setVocabMnemonic(e.target.value)}
                    className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-xs text-slate-100 placeholder-slate-550 focus:outline-none focus:border-purple-500 font-sans"
                    placeholder="e.g. Mitigate sounds like Gate - shutting the gate to keep out problems."
                  />
                </label>

                <div className="block text-xs text-slate-450 font-semibold">
                  Visual Reference Image (Optional)
                  <div
                    className="mt-2 w-full rounded-2xl border-2 border-dashed border-slate-700 bg-slate-900 focus:outline-none focus:border-purple-500 transition cursor-pointer relative overflow-hidden hover:border-purple-500/40"
                    onPaste={(e) => handleImagePaste(e, setVocabImage)}
                    tabIndex={0}
                    title="Click to focus, then Ctrl+V / Cmd+V to paste an image"
                  >
                    {vocabImage ? (
                      <div className="relative p-2">
                        <img src={vocabImage} alt="Visual reference" className="max-h-36 mx-auto rounded-xl object-contain" />
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setVocabImage(null) }}
                          className="absolute top-3 right-3 bg-rose-500/80 hover:bg-rose-600 text-white rounded-full w-5 h-5 text-[10px] flex items-center justify-center"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <div className="px-4 py-5 text-center space-y-1">
                        <span className="text-xl opacity-50">🖼️</span>
                        <p className="text-[10px] text-slate-500">Click here, then paste (Ctrl+V / Cmd+V)</p>
                        <p className="text-[9px] text-slate-600">Works with screenshots, Google Images, any copied image</p>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full rounded-2xl bg-gradient-to-r from-purple-500 to-indigo-600 py-3 text-xs font-semibold text-white shadow-lg shadow-purple-500/15 hover:from-purple-600 hover:to-indigo-700 transition"
                >
                  Save New Term
                </button>
              </form>
            </section>
          </div>

          {/* RIGHT COLUMN: Searchable dictionary list */}
          <div className="space-y-6">
            
            {/* Filters panel */}
            <section className="rounded-3xl border border-slate-800 bg-slate-950/90 p-6 shadow-lg space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                
                {/* Search field */}
                <div className="flex-1 relative">
                  <input
                    value={vocabSearch}
                    onChange={(e) => setVocabSearch(e.target.value)}
                    className="w-full rounded-2xl border border-slate-700 bg-slate-900 pl-4 pr-10 py-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500"
                    placeholder="Search word, definition, coding context..."
                  />
                  <span className="absolute right-3.5 top-3.5 text-sm opacity-40 select-none pointer-events-none">🔍</span>
                </div>

                {/* Import/Starter Helper if list is empty */}
                <button
                  type="button"
                  onClick={importDeveloperPack}
                  className="rounded-2xl border border-slate-800 bg-slate-900/60 text-slate-350 text-xs px-4 py-3 font-semibold hover:border-purple-500/20 hover:text-purple-300 transition"
                >
                  📥 Developer Pack
                </button>
              </div>

              {/* Filter Row 1: Category */}
              <div className="space-y-1">
                <span className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Category Area</span>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {['All', 'Coding Term', 'General English', 'Business Idiom', 'Academic'].map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setVocabFilterCategory(cat)}
                      className={`rounded-lg px-2.5 py-1 text-[10px] font-bold border transition ${
                        vocabFilterCategory === cat
                          ? 'bg-purple-600/20 border-purple-500 text-purple-300'
                          : 'border-slate-850 bg-slate-900/40 text-slate-400 hover:border-slate-800 hover:text-slate-200'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Filter Row 2: Difficulty & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-800 pt-3">
                <div className="space-y-1">
                  <span className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Difficulty</span>
                  <div className="flex gap-1.5 pt-1">
                    {['All', 'Easy', 'Medium', 'Hard'].map(diff => (
                      <button
                        key={diff}
                        type="button"
                        onClick={() => setVocabFilterDifficulty(diff)}
                        className={`rounded-lg px-2 py-0.5 text-[9px] font-bold border transition ${
                          vocabFilterDifficulty === diff
                            ? 'bg-purple-600/20 border-purple-500 text-purple-300'
                            : 'border-slate-850 bg-slate-900/40 text-slate-400 hover:border-slate-800 hover:text-slate-200'
                        }`}
                      >
                        {diff}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Status</span>
                  <div className="flex gap-1.5 pt-1">
                    {['All', 'Learning', 'Mastered'].map(status => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => setVocabFilterStatus(status === 'Learning' ? 'learning' : status === 'Mastered' ? 'mastered' : 'All')}
                        className={`rounded-lg px-2 py-0.5 text-[9px] font-bold border transition ${
                          (status === 'Learning' && vocabFilterStatus === 'learning') || 
                          (status === 'Mastered' && vocabFilterStatus === 'mastered') ||
                          (status === 'All' && vocabFilterStatus === 'All')
                            ? 'bg-purple-600/20 border-purple-500 text-purple-300'
                            : 'border-slate-850 bg-slate-900/40 text-slate-400 hover:border-slate-800 hover:text-slate-200'
                        }`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {vocabMessage && (
              <div className="rounded-2xl border border-purple-500/20 bg-purple-950/30 p-4 text-sm text-purple-200 animate-fade-in">
                {vocabMessage}
              </div>
            )}

            {/* List dictionary */}
            <div className="space-y-4 max-h-[640px] overflow-y-auto pr-1">
              {filteredVocab.length === 0 ? (
                <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-8 text-center text-slate-500">
                  No vocabulary found matching your criteria.
                </div>
              ) : (
                filteredVocab.map((vocab) => {
                  const isExpanded = expandedCardIds.includes(vocab.id)
                  const isEditing = editingWordId === vocab.id

                  return (
                    <div 
                      key={vocab.id} 
                      className={`rounded-3xl border bg-slate-950/80 p-5 shadow-md transition-all duration-200 animate-fade-in relative group ${
                        isExpanded ? 'border-purple-500/20 shadow-purple-950/10' : 'border-slate-800 hover:border-purple-500/15'
                      }`}
                    >
                      {/* CARD HEADER (Always Visible) */}
                      <div 
                        className="flex items-start justify-between cursor-pointer"
                        onClick={() => toggleExpandCard(vocab.id)}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-base font-bold text-slate-100">{vocab.word}</h4>
                            <span className="text-[10px] text-purple-400 italic font-semibold">({vocab.partOfSpeech})</span>
                            
                            {/* Status and Difficulty Badges */}
                            <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                              vocab.difficulty === 'Easy' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                              vocab.difficulty === 'Hard' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                              'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            }`}>
                              {vocab.difficulty}
                            </span>

                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                              vocab.status === 'mastered' 
                                ? 'bg-emerald-600/15 text-emerald-300 border border-emerald-500/10' 
                                : 'bg-purple-950/50 text-purple-300 border border-purple-800/20'
                            }`}>
                              {vocab.status === 'mastered' ? '✅ Mastered' : '📖 Learning'}
                            </span>
                          </div>
                          <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-500">
                            {vocab.category}
                          </span>
                        </div>

                        {/* Right Action tools */}
                        <div className="flex items-center gap-1.5 onClickStopProp" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => toggleVocabStatus(vocab.id)}
                            className={`p-1.5 rounded-xl border text-xs transition ${
                              vocab.status === 'mastered'
                                ? 'bg-emerald-600/20 border-emerald-500/40 text-emerald-250 hover:bg-emerald-600/30'
                                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-purple-300 hover:border-purple-500/30'
                            }`}
                            title={vocab.status === 'mastered' ? 'Mark as learning' : 'Mark as mastered'}
                          >
                            {vocab.status === 'mastered' ? '✔️' : '⭐'}
                          </button>
                          
                          <button
                            type="button"
                            onClick={() => handleDeleteVocab(vocab.id)}
                            className="p-1.5 rounded-xl border border-rose-500/20 bg-rose-550/10 text-rose-300 hover:bg-rose-550/20 transition opacity-0 group-hover:opacity-100"
                            title="Delete word"
                          >
                            🗑️
                          </button>

                          <span className={`text-slate-500 text-xs transition duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                            ▼
                          </span>
                        </div>
                      </div>

                      {/* CARD DETAILS (Expanded / Collapsible view) */}
                      {isExpanded && (
                        <div className="mt-4 border-t border-slate-800 pt-4 space-y-4 text-xs">
                          {isEditing ? (
                            // Inline Edit fields
                            <div className="space-y-3 p-3 rounded-2xl border border-slate-800 bg-slate-900/50">
                              <span className="block text-[10px] font-extrabold uppercase text-purple-400 mb-2">Edit Word Details</span>
                              
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <label className="block text-[10px] font-bold text-slate-400">
                                  Word name
                                  <input 
                                    value={editFields.word || ''} 
                                    onChange={(e) => setEditFields({ ...editFields, word: e.target.value })}
                                    className="mt-1 w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-100"
                                  />
                                </label>
                                <label className="block text-[10px] font-bold text-slate-400">
                                  Part of Speech
                                  <input 
                                    value={editFields.partOfSpeech || ''} 
                                    onChange={(e) => setEditFields({ ...editFields, partOfSpeech: e.target.value })}
                                    className="mt-1 w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-100"
                                  />
                                </label>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <label className="block text-[10px] font-bold text-slate-400">
                                  Category
                                  <select 
                                    value={editFields.category || ''} 
                                    onChange={(e) => setEditFields({ ...editFields, category: e.target.value })}
                                    className="mt-1 w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-1.5 text-xs text-slate-100"
                                  >
                                    <option value="Coding Term">Coding Term</option>
                                    <option value="General English">General English</option>
                                    <option value="Business Idiom">Business Idiom</option>
                                    <option value="Academic">Academic</option>
                                  </select>
                                </label>
                                <label className="block text-[10px] font-bold text-slate-400">
                                  Difficulty
                                  <select 
                                    value={editFields.difficulty || ''} 
                                    onChange={(e) => setEditFields({ ...editFields, difficulty: e.target.value })}
                                    className="mt-1 w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-1.5 text-xs text-slate-100"
                                  >
                                    <option value="Easy">Easy</option>
                                    <option value="Medium">Medium</option>
                                    <option value="Hard">Hard</option>
                                  </select>
                                </label>
                              </div>

                              <label className="block text-[10px] font-bold text-slate-400">
                                Definition
                                <textarea 
                                  value={editFields.definition || ''} 
                                  onChange={(e) => setEditFields({ ...editFields, definition: e.target.value })}
                                  className="mt-1 w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-100 font-sans"
                                  rows={2}
                                />
                              </label>

                              <label className="block text-[10px] font-bold text-slate-400">
                                General Example
                                <textarea 
                                  value={editFields.example || ''} 
                                  onChange={(e) => setEditFields({ ...editFields, example: e.target.value })}
                                  className="mt-1 w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-100 font-sans"
                                  rows={2}
                                />
                              </label>

                              <label className="block text-[10px] font-bold text-slate-400">
                                Coding Context
                                <textarea 
                                  value={editFields.codeContext || ''} 
                                  onChange={(e) => setEditFields({ ...editFields, codeContext: e.target.value })}
                                  className="mt-1 w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-100 font-mono"
                                  rows={2}
                                />
                              </label>

                              <label className="block text-[10px] font-bold text-slate-400">
                                Memory Hook
                                <input 
                                  value={editFields.mnemonic || ''} 
                                  onChange={(e) => setEditFields({ ...editFields, mnemonic: e.target.value })}
                                  className="mt-1 w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-100 font-sans"
                                />
                              </label>

                              <div className="flex gap-2 pt-2">
                                <button
                                  type="button"
                                  onClick={() => setEditingWordId(null)}
                                  className="flex-1 rounded-xl border border-slate-850 bg-slate-950 text-[10px] py-2 font-semibold transition"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  onClick={saveEditing}
                                  className="flex-1 rounded-xl bg-purple-600 text-[10px] py-2 font-semibold text-white hover:bg-purple-700 transition"
                                >
                                  Save Changes
                                </button>
                              </div>
                            </div>
                          ) : (
                            // Render static details
                            <div className="space-y-3 animate-fade-in">
                              
                              {/* Definition */}
                              <div>
                                <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">Definition</span>
                                <p className="text-slate-200 leading-relaxed font-sans">{vocab.definition}</p>
                              </div>

                              {/* General Example */}
                              {vocab.example && (
                                <div>
                                  <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">Example Usage</span>
                                  <p className="text-slate-350 italic font-sans">"{vocab.example}"</p>
                                </div>
                              )}

                              {/* Coding Context Example */}
                              {vocab.codeContext && (
                                <div className="bg-slate-950/70 p-3 rounded-2xl border border-slate-800">
                                  <span className="block text-[9px] font-bold uppercase tracking-wider text-purple-400 mb-1">💻 Coding & Tech Context</span>
                                  <code className="block text-[11px] text-slate-300 font-mono leading-relaxed">{vocab.codeContext}</code>
                                </div>
                              )}

                              {/* Mnemonic Hook */}
                              {vocab.mnemonic && (
                                <div className="border-l-2 border-amber-500/40 pl-3">
                                  <span className="block text-[9px] font-bold uppercase tracking-wider text-amber-400 mb-0.5">🧠 Memory Hack (Mnemonic)</span>
                                  <p className="text-slate-350 italic text-[11px] font-sans">{vocab.mnemonic}</p>
                                </div>
                              )}

                              {/* Visual Reference Image */}
                              {vocab.image && (
                                <div>
                                  <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-500 mb-1">🖼️ Visual Reference</span>
                                  <img
                                    src={vocab.image}
                                    alt="Visual reference"
                                    className="max-h-40 rounded-2xl object-contain border border-slate-800 cursor-pointer hover:border-purple-500/30 transition"
                                    onClick={() => setLightboxImage(vocab.image)}
                                    title="Click to view full size"
                                  />
                                </div>
                              )}

                              {/* Action Footer */}
                              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                                <button
                                  type="button"
                                  onClick={() => startEditing(vocab)}
                                  className="rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-1.5 text-[10px] font-bold text-slate-300 hover:text-purple-300 hover:border-purple-500/20 transition"
                                >
                                  ✏️ Edit Word
                                </button>
                              </div>

                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      ) : (
        // --- CODING ARENA VIEW ---
        <div className="grid gap-6 lg:grid-cols-12 animate-fade-in h-auto lg:h-[780px]">
          {/* LEFT SIDE: CHALLENGE SELECTOR & CODE EDITOR (lg:col-span-7) */}
          <div className="lg:col-span-7 flex flex-col rounded-3xl border border-slate-800 bg-slate-950/90 p-5 shadow-lg min-h-[500px] lg:h-full">
            {/* Header: Selector & Difficulty */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3.5 mb-4 select-none">
              <div className="flex gap-4 items-center flex-wrap">
                <div className="space-y-1">
                  <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-550">Language</span>
                  <select
                    value={codingLanguage}
                    onChange={(e) => handleSelectLanguage(e.target.value)}
                    className="rounded-xl border border-slate-750 bg-slate-900 px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500 font-bold cursor-pointer"
                  >
                    <option value="javascript">JavaScript / Node / MongoDB</option>
                    <option value="rust">Rust Language 🦀</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-555">Practice Challenge</span>
                  <select
                    value={codingChallenge ? codingChallenge.id : ''}
                    onChange={(e) => handleSelectChallenge(e.target.value)}
                    className="rounded-xl border border-slate-750 bg-slate-900 px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500 font-bold cursor-pointer"
                  >
                    {codingChallenges.filter(c => c.language === codingLanguage).map(c => (
                      <option key={c.id} value={c.id}>{c.title}</option>
                    ))}
                  </select>
                </div>
              </div>

              {codingChallenge && (
                <div className="flex gap-2">
                  <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md border ${
                    codingChallenge.difficulty === 'Easy' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                    codingChallenge.difficulty === 'Hard' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                    'bg-amber-500/10 text-amber-400 border-amber-500/20'
                  }`}>
                    {codingChallenge.difficulty}
                  </span>
                </div>
              )}
            </div>

            {codingChallenge ? (
              <>
                {/* Challenge Description */}
                <div className="p-3.5 rounded-2xl bg-slate-900/30 border border-slate-800 mb-4 text-xs select-text">
                  <span className="font-bold text-slate-300">🎯 Objective:</span>
                  <p className="text-slate-400 mt-1 leading-relaxed">{codingChallenge.description}</p>
                </div>

                {/* Editor Label & Controls */}
                <div className="flex justify-between items-center mb-2 select-none">
                  <span className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider">Source Editor</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (codingChallenge.files) {
                          setUserCode(codingChallenge.files)
                        } else {
                          setUserCode(codingChallenge.starterCode)
                        }
                      }}
                      className="px-2.5 py-1 text-[9px] font-bold border border-slate-800 bg-slate-900/50 hover:bg-slate-900 rounded-lg text-slate-400 hover:text-slate-200 transition pointer-events-auto cursor-pointer"
                      title="Reset code back to starter template"
                    >
                      Reset Template 🔄
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (codingChallenge.language === 'rust') {
                          runRustCode(codingChallenge.id, userCode)
                        } else if (codingChallenge.id === 'js-complete-stack') {
                          runCompleteStackCode(userCode)
                        } else {
                          runBackendCode(userCode)
                        }
                      }}
                      className="px-3.5 py-1 text-[9px] font-black bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white rounded-lg transition shadow-md shadow-purple-500/10 flex items-center gap-1 pointer-events-auto cursor-pointer"
                    >
                      <span>▶</span> Run Code
                    </button>
                  </div>
                </div>

                {/* File Switcher Tabs (For Multi-file Challenges) */}
                {codingChallenge.files && activeFile && (
                  <div className="flex flex-wrap gap-1 mb-2 bg-slate-900/60 p-1 rounded-xl border border-slate-800 select-none">
                    {Object.keys(codingChallenge.files).map((fileName) => {
                      const isActive = activeFile === fileName;
                      return (
                        <button
                          key={fileName}
                          type="button"
                          onClick={() => setActiveFile(fileName)}
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold transition flex items-center gap-1.5 cursor-pointer ${
                            isActive
                              ? 'bg-slate-950 text-purple-400 border border-slate-800 shadow-sm'
                              : 'text-slate-400 hover:text-slate-200 bg-transparent hover:bg-slate-950/30'
                          }`}
                        >
                          <span className={isActive ? 'text-purple-400' : 'text-slate-500'}>📄</span>
                          {fileName}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Editor Container */}
                <div className="flex-1 min-h-0 relative border border-slate-800 rounded-2xl overflow-hidden bg-slate-950">
                  <textarea
                    value={activeFile ? (userCode[activeFile] || '') : userCode}
                    onChange={(e) => {
                      if (activeFile) {
                        setUserCode(prev => ({
                          ...prev,
                          [activeFile]: e.target.value
                        }))
                      } else {
                        setUserCode(e.target.value)
                      }
                    }}
                    className="w-full h-full p-4 bg-transparent resize-none border-0 text-[11px] font-mono text-slate-300 placeholder-slate-650 focus:outline-none leading-relaxed overflow-y-auto"
                    placeholder="// Write your code here..."
                    spellCheck={false}
                  />
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-500 text-xs py-20">
                No challenges available for this language yet.
              </div>
            )}
          </div>

          {/* RIGHT SIDE: LIVE OUTPUT / MOCK TERMINAL (lg:col-span-5) */}
          <div className="lg:col-span-5 flex flex-col rounded-3xl border border-slate-800 bg-slate-950/90 p-5 shadow-lg min-h-[350px] lg:h-full">
            <div className="border-b border-slate-800 mb-4 select-none">
              <h4 className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                Execution Terminal Output
              </h4>
              <span className="text-[9px] text-slate-500 mt-0.5">
                {codingLanguage === 'rust' 
                  ? 'Simulated Rustc cargo compiler and error checking console' 
                  : 'Console outputs and evaluation logs'
                }
              </span>
            </div>

            {/* Backend Output Terminal Console */}
            <div className="flex-1 rounded-2xl border border-slate-800 bg-slate-950/80 p-4 font-mono text-xs overflow-y-auto flex flex-col space-y-1.5 select-text">
              <div className="text-[10px] text-slate-500 border-b border-slate-800 pb-1.5 mb-2 select-none uppercase font-bold tracking-widest flex justify-between">
                <span>console.logs</span>
                <button 
                  onClick={() => setTerminalLogs([])}
                  className="text-[9px] text-slate-550 hover:text-slate-450 transition pointer-events-auto cursor-pointer"
                >
                  Clear Terminal
                </button>
              </div>
              
              {terminalLogs.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-500 text-[10px] space-y-1 select-none font-sans py-20 text-center">
                  <span>💻 Terminal is Idle</span>
                  <span>Click 'Run Code' to execute your code and view console prints here.</span>
                </div>
              ) : (
                terminalLogs.map((log, lIdx) => (
                  <div 
                    key={lIdx} 
                    className={`leading-relaxed border-l-2 pl-2 ${
                      log.startsWith('🔴') || log.startsWith('error')
                        ? 'text-rose-455 border-rose-500 bg-rose-500/5 py-1 pr-1 rounded-r-md' 
                        : log.startsWith('✓') || log.startsWith('GET Response') || log.startsWith('POST Valid') || log.startsWith('Generated JWT') || log.startsWith('Division succeeded') || log.startsWith('Summary:') || log.startsWith('The length of')
                        ? 'text-emerald-455 border-emerald-500' 
                        : log.startsWith('   Compiling') || log.startsWith('    Finished') || log.startsWith('     Running')
                        ? 'text-purple-400 border-purple-500/40 font-bold'
                        : 'text-slate-300 border-slate-750/40'
                    }`}
                  >
                    {log}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Lightbox / Image Preview Modal */}
      {lightboxImage && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 backdrop-blur-md animate-fade-in p-4 cursor-zoom-out select-none"
          onClick={() => setLightboxImage(null)}
        >
          <div className="relative max-w-5xl max-h-[90vh] flex flex-col items-center justify-center">
            <img 
              src={lightboxImage} 
              alt="Fullscreen Zoom" 
              className="max-w-full max-h-[85vh] rounded-2xl border border-slate-800 shadow-2xl object-contain animate-scale-up"
            />
            <button
              type="button"
              onClick={() => setLightboxImage(null)}
              className="absolute top-4 right-4 bg-slate-900/90 border border-slate-750 hover:bg-slate-800 text-white rounded-full w-9 h-9 flex items-center justify-center text-sm font-bold shadow-lg transition"
              title="Close image"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
