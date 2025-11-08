import { Scrawn } from '@scrawn/core';

async function main() {
  const scrawn = new Scrawn({ apiKey: (process.env.SCRAWN_API_KEY ?? 'sk_test123456789012') as `sk_${string}` });
  
  await scrawn.sdkCallEventConsumer({ 
    userId: 'u123', 
    debitAmount: 3,
  });
  
  await scrawn.sdkCallEventConsumer({ 
    userId: 'u456', 
    debitAmount: 5,
  });
  
  console.log('✅ SDK call events consumed successfully');
}

main().catch(console.error);