import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import multer from 'multer';
import { ENV } from './env';
import { uploadBaseHandler } from './routes/uploadBase';
import { replyHandler } from './routes/reply';
import { vendorStatusHandler } from './routes/status';
import { avatarMessagesHandler, avatarsHandler, updateAvatarHandler } from './routes/avatars';
import { logError, logInfo } from './utils/logger';

const app = express();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 80 * 1024 * 1024,
  },
});

app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

app.use((req: Request, _res: Response, next: NextFunction) => {
  const header = req.header('x-user-id') ?? req.header('x-user');
  if (header) {
    req.userId = header;
  }
  next();
});

app.get('/health', (_req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

app.get('/status', vendorStatusHandler);
app.get('/avatars', avatarsHandler);
app.get('/avatars/:avatarId/messages', avatarMessagesHandler);
app.patch('/avatars/:avatarId', upload.any(), updateAvatarHandler);
app.post('/upload-base', upload.any(), uploadBaseHandler);
app.post('/reply', replyHandler);
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logError('Unhandled error', err);
  res.status(500).json({ error: 'Unexpected server error' });
});

app.listen(ENV.PORT, () => {
  logInfo(`BaseSpeak API listening on :${ENV.PORT}`);
});
