import { Scrawn } from '@scrawn/core';
import { config } from 'dotenv';
config({path: '.env.local'});

async function main() {
  const scrawn = new Scrawn({
    apiKey: (process.env.SCRAWN_KEY || '') as `scrn_${string}`,
    baseURL: process.env.SCRAWN_BASE_URL || 'http://localhost:8000',
  });
  
  await scrawn.sdkCallEventConsumer({ 
    userId: 'c0971bcb-b901-4c3e-a191-c9a97871c39f', 
    debitAmount: 3,
  });
  
  await scrawn.sdkCallEventConsumer({ 
    userId: '0a1e38a5-e2f3-450f-9796-59ad406d93dc', 
    debitAmount: 5,
  });
  
  console.log('✅ SDK call events consumed successfully');
}

main().catch(console.error);