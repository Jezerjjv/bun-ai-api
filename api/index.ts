export default {
  async fetch(req: Request) {
    return new Response("Servicio corriendo con Bun Nativo en Vercel");
  },
};