const fs = require("fs");
const path = require("path");

exports.uploadLogo = async (req, res, next) => {
  try {
    const tenantId = req.tenantId || req.user?.tenant;

    if (!req.file)
      return res.status(400).json({ success: false, message: "no_file" });

      // If tenantId present, move file into tenant-specific folder for isolation.
      let url;
      if (tenantId) {
        const tenantDir = path.join(__dirname, '..', 'uploads', tenantId.toString());
        if (!fs.existsSync(tenantDir)) fs.mkdirSync(tenantDir, { recursive: true });
        const newPath = path.join(tenantDir, req.file.filename);
        fs.renameSync(req.file.path, newPath);
        url = `/uploads/${tenantId}/${req.file.filename}`;
      } else {
        // No tenant provided (e.g., PSA uploading logo before tenant exists) — keep file in root uploads
        url = `/uploads/${req.file.filename}`;
      }

    res.json({ success: true, url });
  } catch (err) {
    console.error("Upload error:", err);
    next(err);
  }
};
