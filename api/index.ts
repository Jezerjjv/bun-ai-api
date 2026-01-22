import express from 'express';

const app = express();
const PORT = process.env.PORT || 3001;

app.get('/api/test', (req, res) => {
  res.json({ mensaje: "API Express funcionando en Vercel" });
});

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Servidor local en http://localhost:${PORT}`);
  });
}
export default app;