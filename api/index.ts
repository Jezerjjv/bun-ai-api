import express from 'express';


const app = express();


app.get('/', (req, res) => {
  res.json({ mensaje: "API Express funcionando en Vercel" });
});
export default app;


if (process.env.NODE_ENV !== 'production') {
  app.listen(3001, () => {
    console.log(`Servidor local en http://localhost:3001`);
  });
}

