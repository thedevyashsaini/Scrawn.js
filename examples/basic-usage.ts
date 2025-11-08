import { Scrawn, type SdkCallEventPayload } from '@scrawn/core';

async function main() {
  const scrawn = await new Scrawn({ apiKey: (process.env.SCRAWN_KEY ?? 'sk_test1234567890ab') as `sk_${string}` }).init();
  
  await scrawn.sdkCallEventConsumer({ 
    userId: 'u123', 
    debitAmount: 3,
  } as SdkCallEventPayload);
  
  await scrawn.sdkCallEventConsumer({ 
    userId: 'u456', 
    debitAmount: 5,
  } as SdkCallEventPayload);
  
  console.log('✅ SDK call events consumed successfully');
}

main().catch(console.error);