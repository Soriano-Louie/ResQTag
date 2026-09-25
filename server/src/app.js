import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { config } from './config/env.js';
import routes from './routes/index.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';

const app = express();

// Trust proxy for Render / Cloud reverse proxies (critical for secure cookies & rate limiters)
app.set('trust proxy', 1);

// Security Headers
app.use(helmet());

// CORS configuration for Cross-Origin Credentials
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  config.clientUrl
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);
    
    // Check if origin matches allowed origins or is a subdomain / Vercel preview
    const isAllowed = allowedOrigins.includes(origin) || 
                      origin.endsWith('.vercel.app') || 
                      origin.endsWith('.onrender.com');
                      
    if (isAllowed) {
      return callback(null, true);
    }
    return callback(null, true); // Permissive in dev, supports dynamic client origins
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsing & Cookie parsing
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));
app.use(cookieParser());

// Base Route
app.get('/', (req, res) => {
  res.json({
    app: 'ResQTag API',
    status: 'online',
    version: '1.0.0',
    documentation: '/api/health'
  });
});

// API Routes
app.use('/api', routes);

// Error Handling
app.use(notFound);
app.use(errorHandler);

export default app;
