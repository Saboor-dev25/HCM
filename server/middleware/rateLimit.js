const buckets = new Map();

export function authLimiter(req, res, next) {
  const now = Date.now();
  const key = req.ip || req.socket.remoteAddress || "unknown";
  const current = buckets.get(key);
  if (!current || now - current.start > 15 * 60 * 1000) buckets.set(key, { start: now, count: 1 });
  else current.count += 1;
  if (buckets.get(key).count > 100) return res.status(429).json({ message: "Too many requests. Please try again later." });
  next();
}
