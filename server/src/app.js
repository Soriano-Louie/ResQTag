import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './config/env.js';
import routes from './routes/index.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';
import { generalLimiter } from './middleware/rateLimiter.js';
import { sanitizeInputs } from './middleware/sanitize.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();


// Trust proxy for Render / Cloud reverse proxies (critical for secure cookies & rate limiters)
app.set('trust proxy', 1);

// Enhanced Security Headers via Helmet
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
      connectSrc: ["'self'", 'https:', 'http://localhost:*']
    }
  },
  frameguard: { action: 'deny' }, // Clickjacking protection
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true }, // Enforce HTTPS
  noSniff: true, // Prevent MIME type sniffing
  xssFilter: true // Enable XSS filter
}));

// Additional Defensive Security Headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  next();
});

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

// Body parsing & Cookie parsing (with conservative payload size limits)
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(cookieParser());

// Input Sanitization (protects against script injections and HTML payloads in data inputs)
app.use(sanitizeInputs);

// Static directory for uploaded receipt files
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

// General Rate Limiter (applies to all endpoints)
app.use(generalLimiter);


// Base Route
app.get('/', (req, res) => {
  res.json({
    app: 'ResQTag API',
    status: 'online',
    version: '1.0.0',
    documentation: '/api/health'
  });
});

// API Routes (Mounted under /api as well as root for flexibility)
app.use('/api', routes);
app.use('/', routes);

// Error Handling
app.use(notFound);
app.use(errorHandler);

export default app;
