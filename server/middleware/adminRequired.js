export function adminRequired(req, res, next) {
  if (req.user?.role === "admin") {
    return next();
  }

  return res.status(403).json({
    ok: false,
    error: "Admin access required",
  });
}
