import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';


// Import routes
import authRoutes from './routes/auth';
import propertyRoutes from './routes/properties';
import bookingRoutes from './routes/bookings';

// Import database
import { healthCheck } from './database/supabase';

// Import types
import { ApiResponse } from './types';

// Load environment variables
dotenv.config();

class App {
  public app: Application;

  constructor() {
    this.app = express();
    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  private initializeMiddlewares(): void {
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
    }));

    // CORS configuration
    this.app.use(cors({
      origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
      max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // limit each IP to 100 requests per windowMs
      message: {
        success: false,
        message: 'Too many requests from this IP, please try again later.',
      },
      standardHeaders: true,
      legacyHeaders: false,
    });

    this.app.use('/api/', limiter);

    // Logging
    if (process.env.NODE_ENV === 'development') {
      this.app.use(morgan('dev'));
    } else {
      this.app.use(morgan('combined'));
    }

    // Body parsing middleware
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Trust proxy (for rate limiting behind reverse proxy)
    this.app.set('trust proxy', 1);
  }

  private initializeRoutes(): void {
    // Health check endpoint
    this.app.get('/health', async (req: Request, res: Response<ApiResponse>) => {
      try {
        const dbHealth = await healthCheck();
        
        res.json({
          success: true,
          message: 'Sol-BnB API is healthy',
          data: {
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV || 'development',
            version: '1.0.0',
            database: dbHealth,
            uptime: process.uptime()
          }
        });
      } catch (error) {
        res.status(503).json({
          success: false,
          message: 'Service unavailable',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    this.app.use('/api/auth', authRoutes);
    this.app.use('/api/properties', propertyRoutes);
    this.app.use('/api/bookings', bookingRoutes);
    this.app.get('/api', (req: Request, res: Response<ApiResponse>) => {
      res.json({
        success: true,
        message: 'Sol-BnB API v1.0.0',
        data: {
          endpoints: {
            auth: {
              'POST /api/auth/register': 'Register a new user',
              'POST /api/auth/login': 'Login user',
              'POST /api/auth/connect-wallet': 'Connect Solana wallet',
              'POST /api/auth/disconnect-wallet': 'Disconnect wallet',
              'GET /api/auth/profile': 'Get user profile',
              'PUT /api/auth/profile': 'Update user profile',
              'POST /api/auth/verify-token': 'Verify JWT token',
              'POST /api/auth/logout': 'Logout user'
            },
           properties: {
              'GET /api/properties': 'Search properties with filters',
              'GET /api/properties/map': 'Get properties for map view with bounds',
              'POST /api/properties': 'Create property (requires x-user-id header)',
              'GET /api/properties/:id': 'Get property details',
              'GET /api/properties/:id/similar': 'Get similar properties',
              'PUT /api/properties/:id': 'Update property (requires x-user-id header)',
              'DELETE /api/properties/:id': 'Delete property (requires x-user-id header)',
              'GET /api/properties/:id/availability': 'Check availability for dates',
              'GET /api/properties/host/:hostId': 'Get host properties',
              'GET /api/properties/my/listings': 'Get my properties (requires x-user-id header)'
            }
          },
          documentation: 'https://docs.sol-bnb.com',
          support: 'support@sol-bnb.com'
        }
      });
    });

  }

  private initializeErrorHandling(): void {
    // Global error handler
    this.app.use((error: Error, req: Request, res: Response<ApiResponse>, next: NextFunction) => {
      console.error('Global error handler:', error);

      // Handle specific error types
      if (error.name === 'ValidationError') {
        res.status(400).json({
          success: false,
          message: 'Validation error',
          error: error.message
        });
        return;
      }

      if (error.name === 'UnauthorizedError') {
        res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
        return;
      }

      if (error.name === 'CastError') {
        res.status(400).json({
          success: false,
          message: 'Invalid ID format'
        });
        return;
      }

      // Default error response
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
      console.error('Unhandled Rejection at:', promise, 'reason:', reason);
      // Don't exit the process in production
      if (process.env.NODE_ENV !== 'production') {
        process.exit(1);
      }
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error: Error) => {
      console.error('Uncaught Exception:', error);
      // Exit the process as the app is in an undefined state
      process.exit(1);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('SIGTERM received. Shutting down gracefully...');
      process.exit(0);
    });

    process.on('SIGINT', () => {
      console.log('SIGINT received. Shutting down gracefully...');
      process.exit(0);
    });
  }

  public listen(): void {
    const port = process.env.PORT || 3001;
    
    this.app.listen(port, () => {
      console.log('🚀 Sol-BnB API Server Started');
      console.log(`📡 Server running on port ${port}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 API URL: http://localhost:${port}/api`);
      console.log(`❤️  Health Check: http://localhost:${port}/health`);
      console.log('⚡ Ready to accept connections');
    });
  }
}

export default App;