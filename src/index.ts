import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import trajectoryRouter from './trajectory/routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use(trajectoryRouter);

// Health check
app.get('/', (_req, res) => {
  res.json({ status: 'ok', message: 'Streaming frame server running' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server started on port ${PORT}`);
  console.log(`📁 TRAJDIR: ${process.env.TRAJDIR || '(not set)'}`);
});
