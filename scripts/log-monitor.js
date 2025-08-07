#!/usr/bin/env node

/**
 * INSEAT Backend Live Log Monitor
 * Real-time log monitoring with filtering and analysis capabilities
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const readline = require('readline');

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m'
};

// Log file paths
const LOGS_DIR = path.join(__dirname, '..', 'logs');
const LOG_FILES = {
  combined: path.join(LOGS_DIR, 'combined.log'),
  error: path.join(LOGS_DIR, 'error.log'),
  access: path.join(LOGS_DIR, 'access.log'),
  security: path.join(LOGS_DIR, 'security.log'),
  'app-events': path.join(LOGS_DIR, 'app-events.log'),
  requests: path.join(LOGS_DIR, 'requests.log')
};

// Level-based color mapping
const LEVEL_COLORS = {
  ERROR: colors.bgRed + colors.white,
  WARN: colors.bgYellow + colors.red,
  INFO: colors.green,
  HTTP: colors.cyan,
  DEBUG: colors.blue,
  TRACE: colors.dim
};

class LogMonitor {
  constructor() {
    this.activeProcesses = [];
    this.filters = {
      level: null,
      service: null,
      correlationId: null,
      keyword: null
    };
    this.showHelp();
  }

  showHelp() {
    console.log(`${colors.bright}${colors.cyan}INSEAT Backend Live Log Monitor${colors.reset}\n`);
    console.log(`${colors.bright}Available Commands:${colors.reset}`);
    console.log(`  ${colors.green}tail [logfile]${colors.reset}     - Live tail of log file (default: combined)`);
    console.log(`  ${colors.green}follow [logfile]${colors.reset}   - Alias for tail`);
    console.log(`  ${colors.green}errors${colors.reset}            - Show only error logs in real-time`);
    console.log(`  ${colors.green}security${colors.reset}          - Monitor security events`);
    console.log(`  ${colors.green}api${colors.reset}               - Monitor API requests`);
    console.log(`  ${colors.green}filter <options>${colors.reset}  - Set filters (level, service, keyword)`);
    console.log(`  ${colors.green}clear${colors.reset}             - Clear current filters`);
    console.log(`  ${colors.green}stats${colors.reset}             - Show log statistics`);
    console.log(`  ${colors.green}search <pattern>${colors.reset}  - Search recent logs for pattern`);
    console.log(`  ${colors.green}help${colors.reset}              - Show this help`);
    console.log(`  ${colors.green}exit${colors.reset}              - Exit monitor\n`);
    
    console.log(`${colors.bright}Available Log Files:${colors.reset}`);
    Object.keys(LOG_FILES).forEach(name => {
      const exists = fs.existsSync(LOG_FILES[name]);
      const status = exists ? `${colors.green}✓${colors.reset}` : `${colors.red}✗${colors.reset}`;
      console.log(`  ${status} ${name}`);
    });
    
    console.log(`\n${colors.bright}Examples:${colors.reset}`);
    console.log(`  tail error              - Monitor error logs`);
    console.log(`  filter level=ERROR      - Only show ERROR level logs`);
    console.log(`  filter service=auth     - Only show auth service logs`);
    console.log(`  search "user login"     - Search for user login events`);
    console.log(`\n${colors.yellow}Type a command or press Enter to start:${colors.reset}`);
  }

  async start() {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: `${colors.bright}${colors.blue}log-monitor> ${colors.reset}`
    });

    rl.prompt();

    rl.on('line', (line) => {
      this.handleCommand(line.trim());
      rl.prompt();
    });

    rl.on('close', () => {
      this.cleanup();
      console.log(`\n${colors.yellow}Log monitor stopped.${colors.reset}`);
      process.exit(0);
    });
  }

  handleCommand(command) {
    const [cmd, ...args] = command.split(' ');
    
    switch (cmd.toLowerCase()) {
      case 'tail':
      case 'follow':
        this.tailLog(args[0] || 'combined');
        break;
      case 'errors':
        this.monitorErrors();
        break;
      case 'security':
        this.monitorSecurity();
        break;
      case 'api':
        this.monitorAPI();
        break;
      case 'filter':
        this.setFilter(args.join(' '));
        break;
      case 'clear':
        this.clearFilters();
        break;
      case 'stats':
        this.showStats();
        break;
      case 'search':
        this.searchLogs(args.join(' '));
        break;
      case 'help':
        this.showHelp();
        break;
      case 'exit':
        this.cleanup();
        process.exit(0);
        break;
      case '':
        // Just show prompt again
        break;
      default:
        console.log(`${colors.red}Unknown command: ${cmd}. Type 'help' for available commands.${colors.reset}`);
    }
  }

  tailLog(logName, customFilter = null) {
    this.cleanup(); // Stop any existing tails
    
    const logFile = LOG_FILES[logName];
    if (!logFile || !fs.existsSync(logFile)) {
      console.log(`${colors.red}Log file '${logName}' not found or doesn't exist.${colors.reset}`);
      return;
    }

    console.log(`${colors.bright}${colors.green}Monitoring ${logName} logs... (Press Ctrl+C to stop)${colors.reset}\n`);
    
    const tail = spawn('tail', ['-f', logFile]);
    this.activeProcesses.push(tail);

    tail.stdout.on('data', (data) => {
      const lines = data.toString().split('\n').filter(line => line.trim());
      lines.forEach(line => {
        if (this.passesFilter(line, customFilter)) {
          console.log(this.formatLogLine(line));
        }
      });
    });

    tail.stderr.on('data', (data) => {
      console.error(`${colors.red}Tail error: ${data}${colors.reset}`);
    });

    tail.on('close', (code) => {
      if (code !== 0) {
        console.log(`${colors.yellow}Tail process exited with code ${code}${colors.reset}`);
      }
    });
  }

  monitorErrors() {
    console.log(`${colors.bright}${colors.red}Monitoring ERROR level logs...${colors.reset}\n`);
    this.tailLog('combined', { level: 'ERROR' });
  }

  monitorSecurity() {
    if (fs.existsSync(LOG_FILES.security)) {
      console.log(`${colors.bright}${colors.yellow}Monitoring security events...${colors.reset}\n`);
      this.tailLog('security');
    } else {
      console.log(`${colors.yellow}Security log file not found. Monitoring security events from combined logs...${colors.reset}\n`);
      this.tailLog('combined', { keyword: 'SECURITY' });
    }
  }

  monitorAPI() {
    if (fs.existsSync(LOG_FILES.requests)) {
      console.log(`${colors.bright}${colors.cyan}Monitoring API requests...${colors.reset}\n`);
      this.tailLog('requests');
    } else {
      console.log(`${colors.yellow}Requests log file not found. Monitoring HTTP logs from combined logs...${colors.reset}\n`);
      this.tailLog('combined', { level: 'HTTP' });
    }
  }

  setFilter(filterString) {
    if (!filterString) {
      console.log(`${colors.yellow}Current filters:${colors.reset}`);
      console.log(`  Level: ${this.filters.level || 'none'}`);
      console.log(`  Service: ${this.filters.service || 'none'}`);
      console.log(`  Keyword: ${this.filters.keyword || 'none'}`);
      console.log(`  CorrelationId: ${this.filters.correlationId || 'none'}`);
      return;
    }

    const [key, value] = filterString.split('=');
    if (!key || !value) {
      console.log(`${colors.red}Invalid filter format. Use: filter key=value${colors.reset}`);
      console.log(`${colors.yellow}Available keys: level, service, keyword, correlationId${colors.reset}`);
      return;
    }

    if (key in this.filters) {
      this.filters[key] = value;
      console.log(`${colors.green}Filter set: ${key} = ${value}${colors.reset}`);
    } else {
      console.log(`${colors.red}Invalid filter key: ${key}${colors.reset}`);
    }
  }

  clearFilters() {
    this.filters = {
      level: null,
      service: null,
      correlationId: null,
      keyword: null
    };
    console.log(`${colors.green}All filters cleared.${colors.reset}`);
  }

  passesFilter(line, customFilter = null) {
    const activeFilter = customFilter || this.filters;
    
    // Check level filter
    if (activeFilter.level) {
      if (!line.includes(`[${activeFilter.level.toUpperCase()}]`)) {
        return false;
      }
    }

    // Check service filter
    if (activeFilter.service) {
      if (!line.includes(`[${activeFilter.service.toUpperCase()}]`) && 
          !line.includes(`"service":"${activeFilter.service}"`)) {
        return false;
      }
    }

    // Check correlation ID filter
    if (activeFilter.correlationId) {
      if (!line.includes(activeFilter.correlationId)) {
        return false;
      }
    }

    // Check keyword filter
    if (activeFilter.keyword) {
      if (!line.toLowerCase().includes(activeFilter.keyword.toLowerCase())) {
        return false;
      }
    }

    return true;
  }

  formatLogLine(line) {
    // Try to parse as JSON first (structured logs)
    try {
      const logObj = JSON.parse(line);
      const timestamp = logObj.timestamp || new Date().toISOString();
      const level = (logObj.level || 'INFO').toUpperCase();
      const service = logObj.service || 'UNKNOWN';
      const message = logObj.message || line;
      const correlationId = logObj.correlationId ? logObj.correlationId.slice(-8) : '';
      
      const levelColor = LEVEL_COLORS[level] || colors.white;
      const corrId = correlationId ? `${colors.dim}[${correlationId}]${colors.reset}` : '';
      
      return `${colors.dim}${timestamp}${colors.reset} ${levelColor}${level}${colors.reset} ${colors.cyan}[${service}]${colors.reset}${corrId} ${message}`;
    } catch (e) {
      // If not JSON, format as plain text with basic highlighting
      let formattedLine = line;
      
      // Highlight levels
      Object.keys(LEVEL_COLORS).forEach(level => {
        const regex = new RegExp(`\\[${level}\\]`, 'gi');
        formattedLine = formattedLine.replace(regex, `${LEVEL_COLORS[level]}[${level}]${colors.reset}`);
      });
      
      // Highlight timestamps
      formattedLine = formattedLine.replace(
        /(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3})/g,
        `${colors.dim}$1${colors.reset}`
      );
      
      // Highlight services
      formattedLine = formattedLine.replace(
        /\[([A-Z-]+)\]/g,
        `${colors.cyan}[$1]${colors.reset}`
      );
      
      return formattedLine;
    }
  }

  async showStats() {
    console.log(`${colors.bright}${colors.yellow}Log Statistics:${colors.reset}\n`);
    
    for (const [name, filePath] of Object.entries(LOG_FILES)) {
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        const size = this.formatBytes(stats.size);
        const modified = stats.mtime.toLocaleString();
        
        console.log(`${colors.green}${name}:${colors.reset}`);
        console.log(`  Size: ${size}`);
        console.log(`  Modified: ${modified}`);
        
        // Count lines for smaller files
        if (stats.size < 10 * 1024 * 1024) { // Less than 10MB
          try {
            const content = fs.readFileSync(filePath, 'utf8');
            const lineCount = content.split('\n').length - 1;
            console.log(`  Lines: ${lineCount.toLocaleString()}`);
          } catch (e) {
            console.log(`  Lines: Unable to count (${e.message})`);
          }
        } else {
          console.log(`  Lines: File too large to count`);
        }
        console.log();
      }
    }
  }

  searchLogs(pattern) {
    if (!pattern) {
      console.log(`${colors.red}Please provide a search pattern.${colors.reset}`);
      return;
    }

    console.log(`${colors.bright}${colors.yellow}Searching for: "${pattern}"${colors.reset}\n`);
    
    const grep = spawn('grep', ['-n', '-i', pattern, LOG_FILES.combined]);
    
    grep.stdout.on('data', (data) => {
      const lines = data.toString().split('\n').filter(line => line.trim());
      lines.forEach(line => {
        const [lineNum, ...logParts] = line.split(':');
        const logLine = logParts.join(':');
        console.log(`${colors.dim}Line ${lineNum}:${colors.reset} ${this.formatLogLine(logLine)}`);
      });
    });

    grep.stderr.on('data', (data) => {
      console.error(`${colors.red}Search error: ${data}${colors.reset}`);
    });

    grep.on('close', (code) => {
      if (code === 0) {
        console.log(`${colors.green}Search completed.${colors.reset}`);
      } else if (code === 1) {
        console.log(`${colors.yellow}No matches found for: "${pattern}"${colors.reset}`);
      } else {
        console.log(`${colors.red}Search failed with code ${code}${colors.reset}`);
      }
    });
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  cleanup() {
    this.activeProcesses.forEach(process => {
      try {
        process.kill('SIGTERM');
      } catch (e) {
        // Ignore errors when killing processes
      }
    });
    this.activeProcesses = [];
  }
}

// Handle process termination
process.on('SIGINT', () => {
  console.log(`\n${colors.yellow}Shutting down log monitor...${colors.reset}`);
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log(`\n${colors.yellow}Shutting down log monitor...${colors.reset}`);
  process.exit(0);
});

// Start the monitor
const monitor = new LogMonitor();
monitor.start(); 