require('dotenv').config();
const mongoose = require('mongoose');

async function main() {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
  console.log('Connected to DB');
  
  const Student = require('./models/Student');
  const User = require('./models/User');
  
  // Test exact same queries as resetPassword controller
  const userId = '260008';
  
  console.log('\n--- Testing User.findOne ---');
  const user = await User.findOne({
    $or: [
      { userId: userId },
      { username: userId },
    ]
  }).lean();
  console.log('User result:', user ? `Found: ${user.fullName}` : 'NOT FOUND');
  
  console.log('\n--- Testing Student.findOne ---');
  const student = await Student.findOne({
    $or: [
      { studentId: userId },
      { barcodeId: userId },
    ]
  }).lean();
  console.log('Student result:', student ? `Found: ${student.studentName} (studentId: ${student.studentId})` : 'NOT FOUND');
  
  // Test with String() conversion
  console.log('\n--- Testing Student.findOne with String() ---');
  const student2 = await Student.findOne({ studentId: String(userId) }).lean();
  console.log('Student2 result:', student2 ? `Found: ${student2.studentName}` : 'NOT FOUND');
  
  // Check the studentId field type
  if (student) {
    console.log('\n--- Field type check ---');
    console.log('studentId type:', typeof student.studentId);
    console.log('studentId value:', JSON.stringify(student.studentId));
  }
  
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
