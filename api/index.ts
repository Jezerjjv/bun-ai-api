import express from 'express';

const app = express();
const PORT = process.env.PORT || 3001;

app.get('/api/test', (req, res) => {
  res.json({ mensaje: "API Express funcionando en Vercel" });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});