# Scrawn SDK

A modular TypeScript SDK for billing infrastructure.

## Structure

```
packages/
  scrawn/              # Core SDK package
  @scrawn/
    sdk_call/          # SDK call tracking plugin
```

## Installation

```bash
npm install scrawn @scrawn/sdk_call
```

## Quick Start

```typescript
import { Scrawn } from '@scrawn/core';
import { SdkCallEvent, type sdkCallEventPayload } from '@scrawn/sdk_call';

// Initialize
const scrawn = new Scrawn({ apiKey: process.env.SCRAWN_KEY || 'test-api-key' });
await scrawn.init({ scope: ['sdk_call'] });

// Register plugin
const sdkEvent = new SdkCallEvent(scrawn);

// Track SDK usage
await sdkEvent.consume({ 
  userId: 'u123', 
  usage: 3,
} as sdkCallEventPayload);
```

## Development

### Setup

```bash
# Install dependencies
npm install

# Build all packages
npm run build
```

### Building Individual Packages

```bash
# Build core package
cd packages/scrawn
npm run build

# Build plugin
cd packages/@scrawn/sdk_call
npm run build
```

### Creating New Plugins

1. Create a new package under `packages/@scrawn/`
2. Implement an event handler class with:
   - `name` property
   - `authType` property
3. Export a `register(scrawn)` function
4. Add the plugin as a peer dependency to `@scrawn/core`

## License

MIT
