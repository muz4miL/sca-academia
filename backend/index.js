const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
// const bodyParser = require("body-parser")
const app = express();
const Routes = require("./routes/route.js");

// Phase 2: New Route Imports
const payrollRoutes = require("./routes/payroll-routes.js");
const admissionRoutes = require("./routes/admission-routes.js");

// Phase 3: Operational Controllers Route Imports
const feeRoutes = require("./routes/fee-routes.js");
const sessionRoutes = require("./routes/session-routes.js");
const inventoryRoutes = require("./routes/inventory-routes.js");

const PORT = process.env.PORT || 5000;

dotenv.config();

// app.use(bodyParser.json({ limit: '10mb', extended: true }))
// app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }))

app.use(express.json({ limit: "10mb" }));
app.use(cors());

mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(console.log("Connected to MongoDB"))
  .catch((err) => console.log("NOT CONNECTED TO NETWORK", err));

app.use("/", Routes);

// Phase 2: Wire New Routes
app.use("/api/payroll", payrollRoutes);
app.use("/api/admission", admissionRoutes);

// Phase 3: Wire Operational Controllers Routes
app.use("/api/finance", feeRoutes);
app.use("/api/session", sessionRoutes);
app.use("/api/inventory", inventoryRoutes);

app.listen(PORT, () => {
  console.log(`Server started at port no. ${PORT}`);
});
