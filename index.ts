const serverConfig = {
    port: process.env.PORT ?? 3001,
    async fetch(req: Request) {
      return new Response("Servicio corriendo con Bun Nativo");  
    }
};

// Esto es para que funcione en Vercel
export default serverConfig;