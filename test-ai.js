// Quick test to see if Echo AI is working
const { generateText } = require('ai');

async function test() {
  try {
    console.log('Testing Echo AI...');
    
    // This will fail because we can't import the openai from lib/echo in a simple script
    // But let's at least see if the module loads
    console.log('AI module loaded successfully');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

test();
