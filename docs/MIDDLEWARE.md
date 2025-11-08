# Middleware Event Consumer

## Overview

The `middlewareEventConsumer` method creates an Express-compatible middleware that automatically tracks API endpoint usage for billing purposes. It's framework-agnostic and works with Express, Fastify, and similar Node.js frameworks.

## Features

- **Automatic Tracking**: Seamlessly tracks API calls without modifying your route handlers
- **Custom Extraction**: Flexible extractor function to determine userId and debitAmount from requests
- **Whitelist Support**: Optional endpoint filtering to track only specific routes
- **Non-Blocking**: Events are tracked asynchronously without slowing down your API
- **Error Resilient**: Validation or tracking errors don't break your API - they're logged and skipped
- **Type-Safe**: Full TypeScript support with proper type inference

## Basic Usage

```typescript
import { Scrawn } from '@scrawn/core';
import express from 'express';

const app = express();
const scrawn = new Scrawn({ apiKey: process.env.SCRAWN_KEY });

// Track all endpoints
app.use(scrawn.middlewareEventConsumer({
  extractor: (req) => ({
    userId: req.user.id,
    debitAmount: 1
  })
}));
```

## Configuration

### `extractor` (Required)

A function that extracts `userId` and `debitAmount` from the incoming request.

**Signature:**
```typescript
type PayloadExtractor = (req: MiddlewareRequest) => 
  EventPayload | Promise<EventPayload>
```

**Example:**
```typescript
extractor: (req) => ({
  userId: req.user.id,
  debitAmount: 1
})
```

### `whitelist` (Optional)

An array of endpoint paths to track. If provided, only requests to these paths will be tracked.

**Example:**
```typescript
whitelist: ['/api/generate', '/api/analyze', '/api/premium']
```

## Examples

### 1. Track All Endpoints

```typescript
app.use(scrawn.middlewareEventConsumer({
  extractor: (req) => ({
    userId: req.user?.id || 'anonymous',
    debitAmount: 1
  })
}));
```

### 2. Track Specific Endpoints (Whitelist)

```typescript
app.use(scrawn.middlewareEventConsumer({
  extractor: (req) => ({
    userId: req.headers['x-user-id'] as string,
    debitAmount: 1
  }),
  whitelist: ['/api/generate', '/api/analyze']
}));
```

### 3. Dynamic Debit Amount

```typescript
app.use(scrawn.middlewareEventConsumer({
  extractor: (req) => ({
    userId: req.user.id,
    debitAmount: req.body?.tokens || 1  // Charge based on tokens used
  })
}));
```

### 4. Async Extraction

```typescript
app.use(scrawn.middlewareEventConsumer({
  extractor: async (req) => {
    const cost = await calculateRequestCost(req);
    return {
      userId: req.user.id,
      debitAmount: cost
    };
  }
}));
```

### 5. Extract from Different Request Parts

```typescript
app.use(scrawn.middlewareEventConsumer({
  extractor: (req) => ({
    // From headers
    userId: req.headers['x-user-id'] as string,
    
    // Or from query params
    // userId: req.query.userId as string,
    
    // Or from route params
    // userId: req.params.userId,
    
    // Or from body
    // userId: req.body.userId,
    
    debitAmount: parseInt(req.headers['x-credit-cost'] as string) || 1
  })
}));
```

## Complete Express Example

```typescript
import express from 'express';
import { Scrawn } from '@scrawn/core';

const app = express();
const scrawn = new Scrawn({ apiKey: process.env.SCRAWN_KEY });

// Parse JSON bodies
app.use(express.json());

// Your authentication middleware
app.use((req, res, next) => {
  // Your auth logic here
  req.user = { id: 'user_123' };
  next();
});

// Add Scrawn tracking middleware
app.use(scrawn.middlewareEventConsumer({
  extractor: (req) => ({
    userId: req.user.id,
    debitAmount: 1
  }),
  whitelist: ['/api/generate', '/api/analyze']
}));

// Your API routes
app.post('/api/generate', (req, res) => {
  // This endpoint will be tracked
  res.json({ result: 'generated content' });
});

app.post('/api/analyze', (req, res) => {
  // This endpoint will be tracked
  res.json({ result: 'analysis complete' });
});

app.get('/api/status', (req, res) => {
  // This endpoint will NOT be tracked (not in whitelist)
  res.json({ status: 'ok' });
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
```

## How It Works

1. **Request Arrives**: When a request comes in, the middleware checks if it should be tracked
2. **Whitelist Check**: If a whitelist is provided, the middleware checks if the request path matches
3. **Extract Payload**: The extractor function is called to get userId and debitAmount
4. **Validate**: The extracted payload is validated using Zod schema
5. **Track Event**: The event is tracked asynchronously (non-blocking)
6. **Continue**: The request continues to the next middleware immediately

## Error Handling

The middleware is designed to be resilient:

- **Validation Errors**: If the extracted payload fails validation, the error is logged but the request continues
- **Extraction Errors**: If the extractor function throws, the error is logged but the request continues
- **Tracking Errors**: If the backend call fails, the error is logged but the request continues

This ensures that billing tracking issues never break your API.

## Best Practices

1. **Place After Auth**: Add the middleware after your authentication middleware so you can access `req.user`
2. **Use Whitelist for Expensive Operations**: Only track endpoints that consume significant resources
3. **Dynamic Pricing**: Calculate debitAmount based on actual resource usage (tokens, compute time, etc.)
4. **Error Monitoring**: Monitor your logs for extraction or validation errors
5. **Test Extractor**: Ensure your extractor function always returns valid data

## Type Safety

The middleware is fully type-safe:

```typescript
import type { MiddlewareEventConfig, PayloadExtractor } from '@scrawn/core';

// Define extractor separately with proper types
const extractor: PayloadExtractor = (req) => ({
  userId: req.user.id,
  debitAmount: 1
});

// Use in middleware
app.use(scrawn.middlewareEventConsumer({ extractor }));
```

## Comparison with sdkCallEventConsumer

| Feature | `sdkCallEventConsumer` | `middlewareEventConsumer` |
|---------|----------------------|-------------------------|
| Use Case | Manual tracking | Automatic tracking |
| Integration | Call directly | Express middleware |
| Blocking | Yes (awaited) | No (async tracking) |
| Whitelist | N/A | Optional |
| Extractor | N/A | Required |

Use `sdkCallEventConsumer` for manual tracking in serverless functions or specific code blocks.
Use `middlewareEventConsumer` for automatic tracking of Express/HTTP endpoints.
