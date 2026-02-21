const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Ensure upload directory exists
const uploadDir = path.join(__dirname, "..", "uploads", "students");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log("Created upload directory:", uploadDir);
}

// Configure storage for student photos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Format: {studentId}-{timestamp}.{ext}
    const studentId = req.params.id;
    const timestamp = Date.now();
    const ext = path.extname(file.originalname).toLowerCase() || ".jpg";
    cb(null, `${studentId}-${timestamp}${ext}`);
  },
});

// File filter - only accept images
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png/;
  const extname = allowedTypes.test(
    path.extname(file.originalname).toLowerCase()
  );
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error("Only JPEG and PNG images are allowed"), false);
  }
};

// Configure multer
const uploadStudentPhoto = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max file size
  },
}).single("photo");

// Wrapper middleware with error handling
const handlePhotoUpload = (req, res, next) => {
  uploadStudentPhoto(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      // Multer-specific errors
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          success: false,
          message: "File too large. Maximum size is 5MB",
        });
      }
      return res.status(400).json({
        success: false,
        message: `Upload error: ${err.message}`,
      });
    } else if (err) {
      // Custom errors (e.g., file type validation)
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }
    next();
  });
};

// ========================================
// STUDENT PORTAL SELF-UPLOAD (Profile Picture)
// ========================================

// Configure storage for student portal self-upload (uses req.student)
const portalStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Format: profile-{studentId}-{timestamp}.{ext}
    const studentId = req.student?.studentId || req.student?._id || "unknown";
    const timestamp = Date.now();
    const ext = path.extname(file.originalname).toLowerCase() || ".jpg";
    cb(null, `profile-${studentId}-${timestamp}${ext}`);
  },
});

// Configure multer for student portal photo upload
const uploadStudentPortalPhoto = multer({
  storage: portalStorage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max file size
  },
}).single("photo");

// Wrapper middleware with error handling (student portal)
const handleStudentProfilePhotoUpload = (req, res, next) => {
  uploadStudentPortalPhoto(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          success: false,
          message:
            "File too large. Maximum size is 5MB. Please compress your image and try again.",
        });
      }
      return res.status(400).json({
        success: false,
        message: `Upload error: ${err.message}`,
      });
    } else if (err) {
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }
    next();
  });
};

module.exports = { handlePhotoUpload, handleStudentProfilePhotoUpload, uploadDir };
