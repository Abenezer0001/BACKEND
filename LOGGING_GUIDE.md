# INSEAT Backend Logging System Guide

## Overview

The INSEAT Backend now features a comprehensive centralized logging system using Winston with live monitoring capabilities. This system provides structured logging, correlation tracking, and real-time log monitoring across all services.

## Features

### ✅ Centralized Configuration
- Single logging configuration in `src/config/logger.ts`
- Consistent log formatting across all services
- Environment-based log level configuration
- Multiple transport options (console, files, rotating logs)

### ✅ Structured Logging
- JSON format for machine readability
- Correlation ID tracking for request tracing
- Service-specific metadata
- Standardized log levels: error, warn, info, http, debug, trace

### ✅ Live Log Monitoring
- Interactive command-line log monitor (`scripts/log-monitor.js`)
- Real-time log tailing with `tail -f` integration
- Advanced filtering by level, service, correlation ID, and keywords
- Specialized monitoring modes (errors, security, API requests)

### ✅ Multiple Log Files
- `logs/combined.log` - All logs in JSON format
- `logs/error.log` - Error logs only
- `logs/access.log` - HTTP access logs
- `logs/security.log` - Security-related events
- `logs/app-events.log` - Application events
- Automatic log rotation (10MB max size, 10 files retention)

## Quick Start

### 1. Start Live Logging Test
```bash
# Terminal 1: Generate test logs
node test-live-logging.js

# Terminal 2: Monitor logs in real-time
node scripts/log-monitor.js
```

### 2. Monitor Specific Log Types
```bash
# Monitor only errors
node scripts/log-monitor.js
> errors

# Monitor API requests
node scripts/log-monitor.js
> api

# Monitor security events
node scripts/log-monitor.js
> security

# Tail specific log file
node scripts/log-monitor.js
> tail error
```

### 3. Filter Logs
```bash
node scripts/log-monitor.js
> filter level=ERROR
> filter service=auth-service
> filter keyword="user login"
> clear  # Clear all filters
```

### 4. Search Logs
```bash
node scripts/log-monitor.js
> search "payment failed"
> stats  # Show log file statistics
```

## Integration in Services

### Main Application (app.ts)
The main application has been fully integrated with centralized logging:

```typescript
import { Log, correlationMiddleware, httpLogger } from './config/logger';

// Add correlation ID middleware
app.use(correlationMiddleware);

// Add HTTP request logging
app.use(httpLogger);

// Use structured logging instead of console.log
Log.info('Server starting', { port: 3001 });
Log.error('Database connection failed', { error: err.message });
```

### Auth Service
Updated to use centralized logging with auth-specific methods:

```typescript
import { Log } from './utils/logger';

// Standard logging
Log.info('User authentication process started');
Log.error('Authentication failed', { userId, reason });

// Auth-specific logging
Log.auth.login(userId, 'email', true, { sessionId });
Log.auth.registration(email, true, { method: 'google' });
Log.security.rateLimitExceeded(ip, '/api/auth/login');
Log.permission.denied(userId, 'admin_access', 'user_management');
```

### Order Service
Updated with order-specific logging methods:

```typescript
import { Log } from './config/logger';

// Order-specific logging
Log.order.created(orderId, customerId, total, { items: 3 });
Log.order.updated(orderId, 'confirmed', { estimatedTime: 30 });
Log.websocket.connected(socketId, { userId });
Log.database.query('SELECT', 'orders', 150, { query: 'findById' });
```

## Logging Best Practices

### 1. Use Structured Logging
```typescript
// ✅ Good - Structured with metadata
Log.info('User login successful', {
  userId: 'user123',
  method: 'email',
  ip: '192.168.1.100',
  sessionId: 'sess-abc123'
});

// ❌ Bad - Unstructured string
Log.info('User user123 logged in via email from 192.168.1.100');
```

### 2. Include Correlation IDs
```typescript
// Automatically included with correlationMiddleware
Log.info('Processing payment', { orderId, amount }, req.correlationId);
```

### 3. Use Appropriate Log Levels
- **ERROR**: System errors, exceptions, failures
- **WARN**: Warning conditions, security events
- **INFO**: General information, business events
- **HTTP**: HTTP requests and responses
- **DEBUG**: Detailed information for debugging
- **TRACE**: Very detailed execution flow

### 4. Specialized Logging Methods
```typescript
// Security events
Log.security('Failed login attempt', { ip, attempts: 3 });

// API requests (automatically logged by httpLogger)
Log.api('GET', '/api/users', 200, 150, { responseSize: '2.3KB' });

// Database operations
Log.database('SELECT', 'users', { duration: 25, records: 1 });

// Performance metrics
Log.performance('data_processing', 500, { recordsProcessed: 1000 });

// Business events
Log.business('Order completed', { orderId, total: 45.99 });
```

## Log Monitor Commands Reference

### Basic Commands
- `tail [logfile]` - Live tail of log file (default: combined)
- `follow [logfile]` - Alias for tail
- `errors` - Show only error logs in real-time
- `security` - Monitor security events
- `api` - Monitor API requests
- `help` - Show help information
- `exit` - Exit monitor

### Filtering
- `filter level=ERROR` - Show only ERROR level logs
- `filter service=auth-service` - Show only auth service logs
- `filter keyword=login` - Show logs containing "login"
- `filter correlationId=req-abc123` - Show logs with specific correlation ID
- `clear` - Clear all active filters

### Utilities
- `stats` - Show log file statistics (size, modification date, line count)
- `search <pattern>` - Search recent logs for pattern
- `search "user login"` - Search for exact phrase

### Available Log Files
- `combined` - All logs
- `error` - Error logs only
- `access` - HTTP access logs
- `security` - Security events
- `app-events` - Application events

## Log File Locations and Rotation

### File Structure
```
logs/
├── combined.log        # Current combined logs
├── combined1.log       # Rotated combined logs
├── combined2.log       # Older rotated logs
├── error.log          # Current error logs
├── access.log         # HTTP access logs
├── security.log       # Security events
└── app-events.log     # Application events
```

### Rotation Settings
- **Max File Size**: 10MB for combined/error logs, 5MB for others
- **Max Files**: 10 files for combined/access logs, 5 files for error/security logs
- **Tailable**: Yes (enables live monitoring)

## Environment Configuration

### Environment Variables
```bash
# Log level (error, warn, info, http, debug, trace)
LOG_LEVEL=debug

# Silent console logs (true/false)
SILENT_LOGS=false

# Node environment affects log format
NODE_ENV=development  # Enables colored console output
```

### Development vs Production
- **Development**: Colored console output, debug level enabled
- **Production**: JSON-only output, info level default, no console colors

## Troubleshooting

### Common Issues

1. **Log files not created**
   ```bash
   # Ensure logs directory exists
   mkdir -p logs
   chmod 755 logs
   ```

2. **Permission denied**
   ```bash
   # Fix log directory permissions
   sudo chown -R $USER:$USER logs/
   chmod -R 755 logs/
   ```

3. **Log monitor not showing logs**
   ```bash
   # Check if log files exist
   ls -la logs/
   
   # Test log generation
   node test-logging.js
   ```

4. **High disk usage**
   ```bash
   # Check log file sizes
   du -h logs/
   
   # Clean old rotated logs if needed
   rm logs/*.log.[2-9]
   ```

### Performance Considerations

- Log files are automatically rotated to prevent disk space issues
- JSON format enables efficient log parsing and analysis
- Correlation IDs help trace requests across services
- Different log levels allow filtering by importance

## Migration from Console Logging

### Before (Console Logging)
```typescript
console.log('User logged in:', userId);
console.error('Database error:', error);
console.warn('Rate limit exceeded for IP:', ip);
```

### After (Structured Logging)
```typescript
Log.info('User logged in', { userId, sessionId });
Log.error('Database error', { error: error.message, stack: error.stack });
Log.security('Rate limit exceeded', { ip, endpoint: '/api/auth' });
```

## Next Steps

1. **Complete Console Migration**: Replace remaining 1,600+ console statements with structured logging
2. **Error Handling Standardization**: Implement global error handlers with consistent response formats
3. **Log Aggregation**: Consider integrating with log aggregation services (ELK stack, Fluentd)
4. **Alerting**: Set up alerts for critical error patterns
5. **Metrics**: Extract metrics from structured logs for monitoring dashboards

## Testing the System

Run the comprehensive test to verify everything is working:

```bash
# Test basic logging
node test-logging.js

# Test live logging with monitoring
# Terminal 1:
node test-live-logging.js

# Terminal 2:
node scripts/log-monitor.js
```

This will generate realistic log entries and demonstrate the live monitoring capabilities. 