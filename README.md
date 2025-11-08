# Scrawn SDK

A TypeScript SDK for billing infrastructure.

## Structure

```
packages/
  scrawn/              # Core SDK package with all functionality
```

## Installation

```bash
npm install @scrawn/core
```

## Quick Start

```typescript
import { Scrawn, type SdkCallEventPayload } from '@scrawn/core';

// Initialize
const scrawn = new Scrawn({ apiKey: process.env.SCRAWN_KEY });
await scrawn.init();

// Track SDK usage
await scrawn.sdkCallEventConsumer({ 
  userId: 'u123', 
  debitAmount: 3,
});
```

## Development

### Setup

```bash
# Install dependencies
npm install

# Build
npm run build
```

### Building

```bash
# Build core package
cd packages/scrawn
npm run build
```

### Adding New Event Types

Add new event consumer methods directly to the `Scrawn` class in `packages/scrawn/src/core/scrawn.ts`:

```typescript
// 1. Define the type in types/event.ts
export type MyEventPayload = {
  userId: string;
  customField: string;
}

// 2. Add the method to Scrawn class
async myEventConsumer(payload: MyEventPayload): Promise<void> {
  return this.consumeEvent(payload, 'api', 'MY_EVENT_TYPE');
}
```

## License

MIT
