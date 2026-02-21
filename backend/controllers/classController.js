const Class = require("../models/Class");
const Session = require("../models/Session");
const Student = require("../models/Student");
const Configuration = require("../models/Configuration");

// Create a new class
exports.createClass = async (req, res) => {
  try {
    const { classTitle, gradeLevel, session } = req.body;

    // Validate session
    const sessionExists = await Session.findById(session);
    if (!sessionExists) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid session ID" });
    }

    const newClass = await Class.create({
      classTitle,
      gradeLevel,
      session,
    });

    res.status(201).json({ success: true, data: newClass });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get all classes (with optional session filter)
exports.getClasses = async (req, res) => {
  try {
    const { session } = req.query;
    const filter = session ? { session } : {};

    const classes = await Class.find(filter).populate(
      "session",
      "sessionName status startDate endDate",
    );

    // Read dynamic teacher share from Configuration
    let teacherSharePct = 70; // default
    try {
      const config = await Configuration.findOne();
      if (config?.salaryConfig?.teacherShare) {
        teacherSharePct = config.salaryConfig.teacherShare;
      }
    } catch (e) {
      console.log("Config read skipped, using default 70%:", e.message);
    }

    // Aggregate revenue for each class
    const classesWithRevenue = await Promise.all(
      classes.map(async (classDoc) => {
        // Get all active students enrolled in this class (exclude withdrawn/expelled/suspended)
        const activeFilter = {
          classRef: classDoc._id,
          studentStatus: { $nin: ["Withdrawn", "Expelled", "Suspended"] },
        };
        const students = await Student.find(activeFilter).lean();

        // Sum up paid amounts
        const totalRevenueCollected = students.reduce(
          (sum, student) => sum + (student.paidAmount || 0),
          0,
        );

        // Calculate estimated teacher share using dynamic percentage
        const estimatedTeacherShare = Math.round(totalRevenueCollected * (teacherSharePct / 100));

        return {
          ...classDoc.toObject(),
          totalRevenueCollected,
          estimatedTeacherShare,
          enrolledStudents: students.length,
          teacherSharePct,
        };
      }),
    );

    res.status(200).json({ success: true, data: classesWithRevenue });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update a class
exports.updateClass = async (req, res) => {
  try {
    const { id } = req.params;
    const { classTitle, gradeLevel, session } = req.body;

    // Validate session
    if (session) {
      const sessionExists = await Session.findById(session);
      if (!sessionExists) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid session ID" });
      }
    }

    const updatedClass = await Class.findByIdAndUpdate(
      id,
      { classTitle, gradeLevel, session },
      { new: true, runValidators: true },
    ).populate("session", "sessionName status startDate endDate");

    if (!updatedClass) {
      return res
        .status(404)
        .json({ success: false, message: "Class not found" });
    }

    res.status(200).json({ success: true, data: updatedClass });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete a class
exports.deleteClass = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedClass = await Class.findByIdAndDelete(id);

    if (!deletedClass) {
      return res
        .status(404)
        .json({ success: false, message: "Class not found" });
    }

    res
      .status(200)
      .json({ success: true, message: "Class deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
