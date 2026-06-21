function securityLogger(req, res, next) {
  const start = Date.now();
  res.on('finish', () => {
    const path = req.originalUrl || req.url;
    const isAuth = path.includes('/auth/login') || path.includes('/student-face-login');
    const failed = res.statusCode >= 400;
    if (isAuth && failed) {
      console.warn(
        `[security] ${req.method} ${path} ${res.statusCode} ip=${req.ip} ua=${req.get('user-agent') || '-'} ${Date.now() - start}ms`
      );
    }
    if (res.statusCode === 401 || res.statusCode === 403) {
      console.warn(`[security] denied ${req.method} ${path} ${res.statusCode} ip=${req.ip}`);
    }
  });
  next();
}

module.exports = { securityLogger };
