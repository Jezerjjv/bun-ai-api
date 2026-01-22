# bun-ai-api

OpenAI-compatible chat completion API built with Bun, featuring streaming responses, conversation management, and intelligent caching.

## Features

- **OpenAI Compatible**: Drop-in replacement for OpenAI's `/chat/completions` endpoint
- **Streaming Responses**: Support for real-time streaming with SSE
- **Instruction Prioritization**: Automatically prioritizes system > user > assistant messages
- **Conversation Management**: Maintains conversation history with automatic cleanup
- **Response Caching**: Intelligent caching based on conversation hash
- **TypeScript**: Full TypeScript support with type definitions
- **Docker Ready**: Includes optimized Dockerfile for easy deployment

## Quick Start

### Install Dependencies

```bash
bun install
```

### Run Development Server

```bash
bun run dev
```

### Run Production Server

```bash
bun run start
```

## API Usage

### Chat Completions

Send a POST request to `/chat/completions`:

```bash
curl -X POST http://localhost:3001/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-3.5-turbo",
    "messages": [
      {"role": "system", "content": "You are a helpful assistant."},
      {"role": "user", "content": "Hello, how are you?"}
    ]
  }'
```

### Streaming Response

Enable streaming by setting `stream: true`:

```bash
curl -X POST http://localhost:3001/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-3.5-turbo",
    "messages": [
      {"role": "user", "content": "Tell me a story"}
    ],
    "stream": true
  }'
```

## Docker Deployment

Build and run with Docker:

```bash
# Build image
docker build -t bun-ai-api .

# Run container
docker run -p 3001:3001 bun-ai-api
```

## Configuration

- **Port**: Set via `PORT` environment variable (default: 3001)
- **Cache TTL**: 5 minutes (configurable in code)
- **Max History**: 50 messages per conversation
- **History Cleanup**: Automatically removes old conversations when > 1000 active

## Response Format

The API follows OpenAI's response format exactly:

```json
{
  "id": "chatcmpl-123",
  "object": "chat.completion",
  "created": 1677652288,
  "model": "gpt-3.5-turbo",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Hello! How can I help you today?"
      },
      "finish_reason": "stop"
    }
  ]
}
```

## Development

This project uses Bun for fast development and deployment:

```bash
# Install dependencies
bun install

# Run in development mode with hot reload
bun run dev

# Run in production
bun run start
```