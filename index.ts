interface ChatMessage {
    role: "system" | "user" | "assistant";
    content: string;
}

interface ChatCompletionRequest {
    model: string;
    messages: ChatMessage[];
    stream?: boolean;
    temperature?: number;
    max_tokens?: number;
}

interface ChatCompletionResponse {
    id: string;
    object: string;
    created: number;
    model: string;
    choices: Array<{
        index: number;
        message: {
            role: string;
            content: string;
        };
        finish_reason: string;
    }>;
}

interface ChatCompletionStreamChunk {
    id: string;
    object: string;
    created: number;
    model: string;
    choices: Array<{
        index: number;
        delta: {
            role?: string;
            content?: string;
        };
        finish_reason: string | null;
    }>;
}

const conversationHistory = new Map<string, ChatMessage[]>();
const responseCache = new Map<string, string>();

const MAX_HISTORY_LENGTH = 50;
const CACHE_TTL = 5 * 60 * 1000;

function generateId(): string {
    return Math.random().toString(36).substring(2, 15);
}

function hashConversation(messages: ChatMessage[]): string {
    const content = messages.map(m => `${m.role}:${m.content}`).join('|');
    return Bun.hash(content).toString();
}

function prioritizeInstructions(messages: ChatMessage[]): ChatMessage[] {
    const systemMessages = messages.filter(m => m.role === 'system');
    const userMessages = messages.filter(m => m.role === 'user');
    const assistantMessages = messages.filter(m => m.role === 'assistant');
    
    return [...systemMessages, ...userMessages, ...assistantMessages];
}

function cleanupOldHistory() {
    if (conversationHistory.size > 1000) {
        const entries = Array.from(conversationHistory.entries());
        const toDelete = entries.slice(0, Math.floor(entries.length * 0.3));
        toDelete.forEach(([key]) => conversationHistory.delete(key));
    }
}

async function generateStreamResponse(
    messages: ChatMessage[],
    onChunk: (chunk: string) => void
): Promise<string> {
    const prioritizedMessages = prioritizeInstructions(messages);
    const fullResponse = `Respuesta generada para ${prioritizedMessages.length} mensajes`;
    
    const words = fullResponse.split(' ');
    let accumulatedResponse = '';
    
    for (const word of words) {
        accumulatedResponse += (accumulatedResponse ? ' ' : '') + word;
        onChunk(word + (words.indexOf(word) < words.length - 1 ? ' ' : ''));
        await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    return accumulatedResponse;
}

const server = Bun.serve({
    port: process.env.PORT ?? 3001,
    async fetch(req) {
        const url = new URL(req.url);
        
        if (url.pathname === '/chat/completions' && req.method === 'POST') {
            try {
                const body = await req.json() as ChatCompletionRequest;
                const { messages, stream = false, model = "gpt-3.5-turbo" } = body;
                
                if (!messages || !Array.isArray(messages)) {
                    return new Response(
                        JSON.stringify({ error: "Messages array is required" }),
                        { status: 400, headers: { "Content-Type": "application/json" } }
                    );
                }
                
                const conversationId = generateId();
                const prioritizedMessages = prioritizeInstructions(messages);
                conversationHistory.set(conversationId, prioritizedMessages.slice(-MAX_HISTORY_LENGTH));
                
                const cacheKey = hashConversation(prioritizedMessages);
                const cachedResponse = responseCache.get(cacheKey);
                
                if (cachedResponse) {
                    if (stream) {
                        const stream = new ReadableStream({
                            async start(controller) {
                                const encoder = new TextEncoder();
                                const chunk: ChatCompletionStreamChunk = {
                                    id: generateId(),
                                    object: "chat.completion.chunk",
                                    created: Math.floor(Date.now() / 1000),
                                    model,
                                    choices: [{
                                        index: 0,
                                        delta: { content: cachedResponse },
                                        finish_reason: "stop"
                                    }]
                                };
                                
                                const data = `data: ${JSON.stringify(chunk)}\n\n`;
                                controller.enqueue(encoder.encode(data));
                                controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                                controller.close();
                            }
                        });
                        
                        return new Response(stream, {
                            headers: {
                                'Content-Type': 'text/event-stream',
                                'Cache-Control': 'no-cache',
                                'Connection': 'keep-alive'
                            }
                        });
                    } else {
                        const response: ChatCompletionResponse = {
                            id: generateId(),
                            object: "chat.completion",
                            created: Math.floor(Date.now() / 1000),
                            model,
                            choices: [{
                                index: 0,
                                message: {
                                    role: "assistant",
                                    content: cachedResponse
                                },
                                finish_reason: "stop"
                            }]
                        };
                        
                        return new Response(JSON.stringify(response), {
                            headers: { "Content-Type": "application/json" }
                        });
                    }
                }
                
                cleanupOldHistory();
                
                if (stream) {
                    const stream = new ReadableStream({
                        async start(controller) {
                            const encoder = new TextEncoder();
                            const id = generateId();
                            const created = Math.floor(Date.now() / 1000);
                            let accumulatedContent = '';
                            
                            const response = await generateStreamResponse(prioritizedMessages, (chunk) => {
                                accumulatedContent += chunk;
                                const streamChunk: ChatCompletionStreamChunk = {
                                    id,
                                    object: "chat.completion.chunk",
                                    created,
                                    model,
                                    choices: [{
                                        index: 0,
                                        delta: { content: chunk },
                                        finish_reason: null
                                    }]
                                };
                                
                                const data = `data: ${JSON.stringify(streamChunk)}\n\n`;
                                controller.enqueue(encoder.encode(data));
                            });
                            
                            responseCache.set(cacheKey, response);
                            
                            const finalChunk: ChatCompletionStreamChunk = {
                                id,
                                object: "chat.completion.chunk",
                                created,
                                model,
                                choices: [{
                                    index: 0,
                                    delta: {},
                                    finish_reason: "stop"
                                }]
                            };
                            
                            controller.enqueue(encoder.encode(`data: ${JSON.stringify(finalChunk)}\n\n`));
                            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                            controller.close();
                        }
                    });
                    
                    return new Response(stream, {
                        headers: {
                            'Content-Type': 'text/event-stream',
                            'Cache-Control': 'no-cache',
                            'Connection': 'keep-alive'
                        }
                    });
                } else {
                    const response = await generateStreamResponse(prioritizedMessages, () => {});
                    responseCache.set(cacheKey, response);
                    
                    const completion: ChatCompletionResponse = {
                        id: generateId(),
                        object: "chat.completion",
                        created: Math.floor(Date.now() / 1000),
                        model,
                        choices: [{
                            index: 0,
                            message: {
                                role: "assistant",
                                content: response
                            },
                            finish_reason: "stop"
                        }]
                    };
                    
                    return new Response(JSON.stringify(completion), {
                        headers: { "Content-Type": "application/json" }
                    });
                }
                
            } catch (error) {
                return new Response(
                    JSON.stringify({ error: "Invalid request body" }),
                    { status: 400, headers: { "Content-Type": "application/json" } }
                );
            }
        }
        
        if (url.pathname === '/' && req.method === 'GET') {
            return new Response("API de IA compatible con OpenAI - endpoints: POST /chat/completions");
        }
        
        return new Response("Not Found", { status: 404 });
    }
});

console.log(`Servidor funcionando en el puerto: ${server.port}`);

setInterval(() => {
    const now = Date.now();
    for (const [key] of responseCache.entries()) {
        if (Math.random() < 0.1) {
            responseCache.delete(key);
        }
    }
}, CACHE_TTL);