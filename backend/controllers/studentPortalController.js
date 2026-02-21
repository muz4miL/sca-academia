const Student = require("../models/Student");
const Video = require("../models/Video");
const Lecture = require("../models/Lecture");
const Configuration = require("../models/Configuration");
const path = require("path");
const fs = require("fs");

/**
 * Student Portal Controller - LMS Module
 *
 * Handles student login and portal access.
 */

// @desc    Student login
// @route   POST /api/student-portal/login
// @access  Public
exports.studentLogin = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide username and password",
      });
    }

    // Find student by barcodeId or studentId (include password field)
    const student = await Student.findOne({
      $or: [
        { barcodeId: username },
        { studentId: username },
        { email: username.toLowerCase() },
      ],
    }).select("+password");

    if (!student) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Only Active students can log in
    if (student.studentStatus !== "Active") {
      return res.status(403).json({
        success: false,
        message:
          "Account is pending approval. Please visit the administration office to receive your credentials.",
      });
    }

    // Check password
    if (!student.password) {
      return res.status(401).json({
        success: false,
        message: "Password not set. Contact administration.",
      });
    }

    const isMatch = await student.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Generate JWT token for student session
    const jwt = require("jsonwebtoken");
    const token = jwt.sign(
      {
        id: student._id,
        role: "student",
        studentId: student.studentId,
        barcodeId: student.barcodeId,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    // Set cookie
    res.cookie("studentToken", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    console.log(
      `🎓 Student login: ${student.studentName} (${student.barcodeId})`,
    );

    return res.status(200).json({
      success: true,
      message: `Welcome, ${student.studentName}!`,
      student: student.getStudentProfile(),
      token,
    });
  } catch (error) {
    console.error("❌ Error in studentLogin:", error);
    return res.status(500).json({
      success: false,
      message: "Server error during login",
      error: error.message,
    });
  }
};

// @desc    Get current student profile
// @route   GET /api/student-portal/me
// @access  Protected (Student)
exports.getStudentProfile = async (req, res) => {
  try {
    const student = await Student.findById(req.student._id)
      .populate("classRef", "name subjects")
      .populate("sessionRef", "name startDate endDate")
      .lean();

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    // Get config for profile picture settings
    const config = await Configuration.findOne().lean();
    const pictureSettings = config?.studentProfilePictureSettings || {};

    // Use live class subjects if available, falling back to student's frozen snapshot
    const liveSubjects = student.classRef?.subjects || student.subjects || [];

    return res.status(200).json({
      success: true,
      data: {
        _id: student._id,
        studentId: student.studentId,
        barcodeId: student.barcodeId,
        name: student.studentName,
        fatherName: student.fatherName,
        gender: student.gender,
        class: student.class,
        group: student.group,
        subjects: liveSubjects,
        photo: student.photo || student.imageUrl,
        email: student.email,
        feeStatus: student.feeStatus,
        totalFee: student.totalFee,
        paidAmount: student.paidAmount,
        balance: Math.max(0, student.totalFee - student.paidAmount),
        session: student.sessionRef,
        classRef: student.classRef,
        studentStatus: student.studentStatus,
        profilePictureChangeCount: student.profilePictureChangeCount || 0,
        profilePictureSettings: {
          maxChangesPerStudent: pictureSettings.maxChangesPerStudent ?? 3,
          allowStudentPictureChanges:
            pictureSettings.allowStudentPictureChanges !== false,
          changesRemaining: Math.max(
            0,
            (pictureSettings.maxChangesPerStudent ?? 3) -
              (student.profilePictureChangeCount || 0),
          ),
        },
      },
    });
  } catch (error) {
    console.error("❌ Error in getStudentProfile:", error);
    return res.status(500).json({
      success: false,
      message: "Server error fetching profile",
      error: error.message,
    });
  }
};

// @desc    Get videos for student's class
// @route   GET /api/student-portal/videos
// @access  Protected (Student)
exports.getStudentVideos = async (req, res) => {
  try {
    const student = await Student.findById(req.student._id).lean();

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    // Get videos from old Video model
    const videoQuery = {
      isPublished: true,
    };

    if (student.classRef) {
      videoQuery.classRef = student.classRef;
    } else {
      videoQuery.className = student.class;
    }

    // Optional subject filter
    if (req.query.subject) {
      videoQuery.subjectName = req.query.subject;
    }

    const videos = await Video.find(videoQuery)
      .sort({ sortOrder: 1, uploadedAt: -1 })
      .lean();

    // Also get lectures from new Lecture model (YouTube integration)
    let lectures = [];
    if (student.classRef) {
      const lectureQuery = {
        classRef: student.classRef,
        isLocked: false,
      };
      if (req.query.subject) {
        lectureQuery.subject = req.query.subject;
      }

      lectures = await Lecture.find(lectureQuery)
        .populate("teacherRef", "fullName")
        .sort({ order: 1, createdAt: -1 })
        .lean();
    }

    // Transform lectures to match video format
    const transformedLectures = lectures.map((lecture) => ({
      _id: lecture._id,
      title: lecture.title,
      description: lecture.description,
      url: lecture.youtubeUrl,
      thumbnail: `https://img.youtube.com/vi/${lecture.youtubeId}/mqdefault.jpg`,
      provider: "youtube",
      subjectName: lecture.subject,
      teacherName: lecture.teacherRef?.fullName,
      viewCount: lecture.viewCount || 0,
      isLecture: true, // Flag to identify new lecture system
    }));

    // Combine both sources
    const allVideos = [...videos, ...transformedLectures];

    // Group by subject
    const videosBySubject = {};
    allVideos.forEach((video) => {
      const subject = video.subjectName || "General";
      if (!videosBySubject[subject]) {
        videosBySubject[subject] = [];
      }
      videosBySubject[subject].push(video);
    });

    return res.status(200).json({
      success: true,
      count: allVideos.length,
      data: allVideos,
      bySubject: videosBySubject,
    });
  } catch (error) {
    console.error("❌ Error in getStudentVideos:", error);
    return res.status(500).json({
      success: false,
      message: "Server error fetching videos",
      error: error.message,
    });
  }
};

// @desc    Increment video view count
// @route   POST /api/student-portal/videos/:id/view
// @access  Protected (Student)
exports.recordVideoView = async (req, res) => {
  try {
    const { id } = req.params;

    // Try Video model first, then Lecture model
    let updated = await Video.findByIdAndUpdate(id, {
      $inc: { viewCount: 1 },
    });

    if (!updated) {
      updated = await Lecture.findByIdAndUpdate(id, {
        $inc: { viewCount: 1 },
      });
    }

    return res.status(200).json({
      success: true,
      message: "View recorded",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error recording view",
    });
  }
};

// @desc    Student logout
// @route   POST /api/student-portal/logout
// @access  Protected (Student)
exports.studentLogout = async (req, res) => {
  res.cookie("studentToken", "", {
    httpOnly: true,
    expires: new Date(0),
  });

  return res.status(200).json({
    success: true,
    message: "Logged out successfully",
  });
};

// @desc    Get student's class timetable from Timetable model
// @route   GET /api/student-portal/schedule
// @access  Protected (Student)
exports.getStudentSchedule = async (req, res) => {
  try {
    const Class = require("../models/Class");
    const Timetable = require("../models/Timetable");

    const student = await Student.findById(req.student._id).lean();

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    // Find the class the student is enrolled in
    let classData = null;

    if (student.classRef) {
      classData = await Class.findById(student.classRef).lean();
    } else if (student.class) {
      classData = await Class.findOne({
        $or: [
          { classTitle: { $regex: student.class, $options: "i" } },
          { gradeLevel: { $regex: student.class, $options: "i" } },
        ],
        status: "active",
      }).lean();
    }

    if (!classData) {
      return res.status(200).json({
        success: true,
        data: [],
        className: student.class || "Not Enrolled",
        message: "No schedule found for your class",
      });
    }

    // Query the Timetable model for actual scheduled entries
    const timetableEntries = await Timetable.find({
      classId: classData._id,
      status: "active",
    })
      .populate(
        "classId",
        "classTitle gradeLevel classId subjects subjectTeachers",
      )
      .populate("teacherId", "name teacherId subject")
      .sort({ day: 1, startTime: 1 });

    // Sort by day order then time
    const DAY_ORDER = {
      Monday: 1,
      Tuesday: 2,
      Wednesday: 3,
      Thursday: 4,
      Friday: 5,
      Saturday: 6,
      Sunday: 7,
    };
    timetableEntries.sort((a, b) => {
      const dayDiff = (DAY_ORDER[a.day] || 8) - (DAY_ORDER[b.day] || 8);
      if (dayDiff !== 0) return dayDiff;
      // Parse time for comparison
      const parseTime = (t) => {
        if (!t) return 0;
        const m12 = t.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
        if (m12) {
          let h = parseInt(m12[1]);
          const min = parseInt(m12[2]);
          const p = m12[3].toUpperCase();
          if (p === "PM" && h !== 12) h += 12;
          if (p === "AM" && h === 12) h = 0;
          return h * 60 + min;
        }
        const m24 = t.match(/(\d{1,2}):(\d{2})/);
        if (m24) return parseInt(m24[1]) * 60 + parseInt(m24[2]);
        return 0;
      };
      return parseTime(a.startTime) - parseTime(b.startTime);
    });

    return res.status(200).json({
      success: true,
      count: timetableEntries.length,
      data: timetableEntries,
      className: classData.classTitle || classData.displayName,
      group: classData.group,
    });
  } catch (error) {
    console.error("❌ Error in getStudentSchedule:", error);
    return res.status(500).json({
      success: false,
      message: "Server error fetching schedule",
      error: error.message,
    });
  }
};

// ========================================
// PROFILE PICTURE MANAGEMENT
// ========================================

// @desc    Get profile picture change status
// @route   GET /api/student-portal/profile-picture/status
// @access  Protected (Student)
exports.getProfilePictureStatus = async (req, res) => {
  try {
    const student = await Student.findById(req.student._id).lean();

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    // Get config for max changes
    const config = await Configuration.findOne().lean();
    const settings = config?.studentProfilePictureSettings || {};
    const maxChanges = settings.maxChangesPerStudent ?? 3;
    const allowChanges = settings.allowStudentPictureChanges !== false;

    const changesUsed = student.profilePictureChangeCount || 0;
    const changesRemaining = Math.max(0, maxChanges - changesUsed);
    const canChangeNow = allowChanges && changesRemaining > 0;

    // Get current photo (priority: photo > imageUrl)
    const currentPhoto = student.photo || student.imageUrl || null;

    return res.status(200).json({
      success: true,
      data: {
        currentPhotoUrl: currentPhoto,
        changesUsed,
        changesRemaining,
        maxChangesAllowed: maxChanges,
        canChangeNow,
        allowStudentPictureChanges: allowChanges,
        lastChangeDate:
          student.profilePictureChangeLog?.length > 0
            ? student.profilePictureChangeLog[
                student.profilePictureChangeLog.length - 1
              ].changedAt
            : null,
      },
    });
  } catch (error) {
    console.error("❌ Error in getProfilePictureStatus:", error);
    return res.status(500).json({
      success: false,
      message: "Server error fetching profile picture status",
      error: error.message,
    });
  }
};

// @desc    Upload/change student profile picture
// @route   POST /api/student-portal/profile-picture
// @access  Protected (Student)
exports.updateProfilePicture = async (req, res) => {
  try {
    const student = await Student.findById(req.student._id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    // Get config limits
    const config = await Configuration.findOne().lean();
    const settings = config?.studentProfilePictureSettings || {};
    const maxChanges = settings.maxChangesPerStudent ?? 3;
    const allowChanges = settings.allowStudentPictureChanges !== false;

    if (!allowChanges) {
      return res.status(403).json({
        success: false,
        message:
          "Profile picture changes are currently disabled by administration.",
      });
    }

    const changesUsed = student.profilePictureChangeCount || 0;
    if (changesUsed >= maxChanges) {
      return res.status(403).json({
        success: false,
        message: `You have reached the maximum number of profile picture changes (${maxChanges}). Please contact administration for assistance.`,
      });
    }

    // Check if file was uploaded (multer middleware)
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No image file provided. Please select a photo to upload.",
      });
    }

    // Save old photo URL for change log
    const oldPhotoUrl = student.photo || student.imageUrl || null;

    // Build new photo URL
    const newPhotoUrl = `/uploads/students/${req.file.filename}`;

    // Update student record
    student.photo = newPhotoUrl;
    student.imageUrl = newPhotoUrl;
    student.profilePictureChangeCount = changesUsed + 1;

    // Add to change log
    if (!student.profilePictureChangeLog) {
      student.profilePictureChangeLog = [];
    }
    student.profilePictureChangeLog.push({
      changedAt: new Date(),
      oldPhotoUrl: oldPhotoUrl,
      newPhotoUrl: newPhotoUrl,
      changedBy: "student",
    });

    await student.save();

    const newChangesRemaining = Math.max(0, maxChanges - (changesUsed + 1));

    console.log(
      `📸 Student ${student.studentId} changed profile picture (${changesUsed + 1}/${maxChanges})`,
    );

    return res.status(200).json({
      success: true,
      message: "Profile picture updated successfully!",
      data: {
        photoUrl: newPhotoUrl,
        changesUsed: changesUsed + 1,
        changesRemaining: newChangesRemaining,
        maxChangesAllowed: maxChanges,
        canChangeNow: newChangesRemaining > 0,
      },
    });
  } catch (error) {
    console.error("❌ Error in updateProfilePicture:", error);
    return res.status(500).json({
      success: false,
      message: "Server error updating profile picture",
      error: error.message,
    });
  }
};
