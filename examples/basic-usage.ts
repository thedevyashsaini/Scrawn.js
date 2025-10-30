import { Scrawn } from '@scrawn/core';
import { SdkCallEvent, type sdkCallEventPayload } from '@scrawn/sdk_call';

async function main() {
  const scrawn = new Scrawn({ apiKey: process.env.SCRAWN_KEY || 'test-api-key' });
  await scrawn.init({ scope: ['sdk_call'] });
  
  const sdkEvent = new SdkCallEvent(scrawn);
  
  await sdkEvent.consume({ 
    userId: 'u123', 
    usage: 3,
  } as sdkCallEventPayload);
  
  await sdkEvent.consume({ 
    userId: 'u456', 
    usage: 5 
  } as sdkCallEventPayload);
  
  console.log('✅ SDK call events consumed successfully');
}

main().catch(console.error);