import express from 'express';
import streamingRoutes from './routes/streaming';
import bodyParser from 'body-parser';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(bodyParser.json());

app.use('/api/stream', streamingRoutes);

app.get('/', (req, res) => {
  res.send('Streaming server backend');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});