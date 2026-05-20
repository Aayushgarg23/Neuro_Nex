import express from 'express';
import cors from 'cors';
import { createProxyMiddleware } from 'http-proxy-middleware';

const app = express();
const PORT = process.env.PORT || 3000;
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

app.use(cors({ origin: '*' }));
app.use(express.json());

// Basic BFF Request Logging Middleware
app.use((req, res, next) => {
  console.log(` ${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Proxy router: Forwards Next.js requests to high-speed FastAPI
app.use('/api', createProxyMiddleware({
  target: BACKEND_URL,
  changeOrigin: true,
  pathRewrite: {
    '^/api': '/api', // Maintain standard prefix
  },
}));

app.listen(PORT, () => {
  console.log(`BFF Gateway live on port ${PORT} proxying to ${BACKEND_URL}`);
});