import { Router } from 'express';
import multer from 'multer';
import fs from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { authRequired } from '../middleware/auth.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
// 上传目录支持环境变量（部署到持久卷）
const uploadDir = process.env.DATA_DIR ? join(process.env.DATA_DIR, 'uploads') : join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = file.originalname.split('.').pop();
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

const router = Router();

router.post('/image', authRequired, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: '未收到文件' });
  res.json({ url: `/uploads/${req.file.filename}` });
});

export default router;
export { uploadDir };
