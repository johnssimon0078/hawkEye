const fs = require('fs');
const path = require('path');
const readline = require('readline');
require('dotenv').config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise(resolve => {
    rl.question(prompt, resolve);
  });
}

async function configureEnvironment() {
  console.log('🔧 HawkEye Environment Configuration');
  console.log('═'.repeat(50));
  
  console.log('\n📋 Current Environment Settings:');
  console.log(`🌐 BASE_URL: ${process.env.BASE_URL || 'Not set'}`);
  console.log(`🏠 NODE_ENV: ${process.env.NODE_ENV || 'Not set'}`);
  console.log(`🚪 PORT: ${process.env.PORT || 'Not set'}`);
  console.log(`📊 MongoDB: ${process.env.MONGODB_URI ? 'Configured' : 'Not set'}`);
  console.log(`🤖 Telegram Bot: ${process.env.TELEGRAM_BOT_TOKEN ? 'Configured' : 'Not set'}`);
  
  console.log('\n🎯 Environment Presets:');
  console.log('1. Development (localhost:3000)');
  console.log('2. Production (142.93.220.233:3000)');
  console.log('3. Custom configuration');
  console.log('4. Exit without changes');
  
  const choice = await question('\nSelect environment preset (1-4): ');
  
  let envConfig = {};
  
  switch (choice) {
    case '1':
      envConfig = {
        NODE_ENV: 'development',
        BASE_URL: 'http://localhost:3000',
        PORT: '3000'
      };
      console.log('✅ Development environment selected');
      break;
      
    case '2':
      envConfig = {
        NODE_ENV: 'production',
        BASE_URL: 'http://142.93.220.233:3000',
        PORT: '3000'
      };
      console.log('✅ Production environment selected');
      break;
      
    case '3':
      console.log('\n🛠️  Custom Configuration:');
      envConfig.NODE_ENV = await question('Environment (development/production): ') || 'development';
      envConfig.BASE_URL = await question('Base URL (e.g., http://localhost:3000): ');
      envConfig.PORT = await question('Port (default 3000): ') || '3000';
      
      if (!envConfig.BASE_URL) {
        console.log('❌ BASE_URL is required');
        rl.close();
        return;
      }
      break;
      
    case '4':
      console.log('👋 Exiting without changes');
      rl.close();
      return;
      
    default:
      console.log('❌ Invalid choice');
      rl.close();
      return;
  }
  
  // Update .env file
  try {
    let envContent = '';
    
    // Read existing .env file if it exists
    if (fs.existsSync('.env')) {
      envContent = fs.readFileSync('.env', 'utf8');
    } else {
      // Create from template
      if (fs.existsSync('env.example')) {
        envContent = fs.readFileSync('env.example', 'utf8');
        console.log('📋 Created .env from env.example template');
      }
    }
    
    // Update environment variables
    Object.entries(envConfig).forEach(([key, value]) => {
      const regex = new RegExp(`^${key}=.*$`, 'm');
      if (envContent.match(regex)) {
        envContent = envContent.replace(regex, `${key}=${value}`);
      } else {
        envContent += `\n${key}=${value}`;
      }
    });
    
    // Write updated .env file
    fs.writeFileSync('.env', envContent);
    
    console.log('\n✅ Environment configuration updated!');
    console.log('\n📄 Updated .env file with:');
    Object.entries(envConfig).forEach(([key, value]) => {
      console.log(`   ${key}=${value}`);
    });
    
    // Test the configuration
    console.log('\n🧪 Testing configuration...');
    delete require.cache[require.resolve('dotenv')];
    require('dotenv').config();
    
    console.log(`✅ BASE_URL is now: ${process.env.BASE_URL}`);
    console.log(`✅ NODE_ENV is now: ${process.env.NODE_ENV}`);
    console.log(`✅ PORT is now: ${process.env.PORT}`);
    
    console.log('\n🚀 Configuration complete! You can now:');
    console.log('   • Run tests: node test-end-to-end-workflow.js');
    console.log('   • Start server: npm start');
    console.log('   • Check production: node test-production-alert-processing.js');
    
  } catch (error) {
    console.error('❌ Error updating .env file:', error.message);
  }
  
  rl.close();
}

// Run configuration
configureEnvironment().catch(console.error); 