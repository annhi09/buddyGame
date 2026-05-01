export function creatorRequired(req, res, next) {
  const role = req.user?.role;
  if (role === "creator" || role === "admin") {
    return next();
  }

  return res.status(403).json({
    ok: false,
    error: "Creator access required",
  });
}
