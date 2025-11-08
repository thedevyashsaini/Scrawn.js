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
npm run clean
```

### Building

```bash
npm run build
``

## License

MIT
