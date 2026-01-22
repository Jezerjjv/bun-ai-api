const server = Bun.serve({
    port: process.env.PORT ?? 3001,
    async fetch(req){
      return new Response("Servicio corriendo");  
    }
});

console.log(`server funcionando en el puerto: ${server.port}`);