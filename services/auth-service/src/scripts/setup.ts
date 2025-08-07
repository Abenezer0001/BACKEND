import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

interface SetupStep {
  name: string;
  command: string;
  args: string[];
  message: string;
  verifyFn?: () => Promise<boolean>;
}

async function checkEnvFile(): Promise<boolean> {
  const envPath = path.join(process.cwd(), '.env');
  const envExamplePath = path.join(process.cwd(), '.env.example');
  
  if (!fs.existsSync(envPath)) {
    if (fs.existsSync(envExamplePath)) {
      fs.copyFileSync(envExamplePath, envPath);
      console.log('⚠️  Created .env file from .env.example');
      console.log('⚠️  Please update the .env file with your configuration');
      return true;
    }
    console.error('❌ No .env or .env.example file found');
    return false;
  }
  return true;
}

async function runCommand(step: SetupStep): Promise<boolean> {
  console.log(`\n🚀 ${step.message}\n`);

  return new Promise((resolve) => {
    const process = spawn(step.command, step.args, { stdio: 'inherit' });

    process.on('close', async (code) => {
      if (code === 0) {
        if (step.verifyFn) {
          const verified = await step.verifyFn();
          if (!verified) {
            console.error(`❌ Verification failed for: ${step.name}`);
            resolve(false);
            return;
          }
        }
        console.log(`✅ ${step.message} completed successfully`);
        resolve(true);
      } else {
        console.error(`❌ ${step.message} failed`);
        resolve(false);
      }
    });
  });
}

async function main() {
  console.log('🔧 Starting INSEAT Auth Service setup...\n');

  // Pre-setup checks
  console.log('Running pre-setup checks...');
  
  if (!await checkEnvFile()) {
    process.exit(1);
  }

  const setupSteps: SetupStep[] = [
    {
      name: 'dependencies',
      command: 'npm',
      args: ['install'],
      message: 'Installing dependencies'
    },
    {
      name: 'build',
      command: 'npm',
      args: ['run', 'build'],
      message: 'Building TypeScript'
    },
    {
      name: 'init',
      command: 'npm',
      args: ['run', 'init'],
      message: 'Initializing system'
    },
    {
      name: 'verify',
      command: 'npm',
      args: ['run', 'verify-deployment'],
      message: 'Verifying deployment'
    }
  ];

  for (const step of setupSteps) {
    const success = await runCommand(step);
    if (!success) {
      console.error('\n❌ Setup failed at step:', step.name);
      console.error('Please fix the errors above and try again');
      process.exit(1);
    }
  }

  console.log('\n✨ Setup completed successfully!\n');
  console.log('Next steps:');
  console.log('1. Verify your environment variables in .env');
  console.log('2. Start the development server: npm run dev');
  console.log('3. Create your first sys-admin using the API');
  console.log('4. Test the setup with: npm run test:flow');
  console.log('\nFor more information, check the documentation:');
  console.log('- README.md: General information');
  console.log('- SETUP.md: Detailed setup instructions');
  console.log('- VERIFICATION.md: Verification and testing guide');
}

// Add error handling for uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('\n❌ Setup failed due to uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  console.error('\n❌ Setup failed due to unhandled rejection:', error);
  process.exit(1);
});

// Run setup
main().catch(error => {
  console.error('Setup error:', error);
  process.exit(1);
});

