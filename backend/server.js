const express = require("express");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const errorHandler = require("./middleware/errorHandler");
const cors = require("cors");
const db = require("./config/db");
const logger = require("./middleware/logger");
const employeeRoutes = require("./routes/employees");
const departmentRoutes = require("./routes/departments");
const projectRoutes = require("./routes/projects");
const taskRoutes = require("./routes/tasks");
const authRoutes = require("./routes/auth");
const cookieParser = require("cookie-parser");
const { csrfProtection } = require("./middleware/csrf");
const app = express();

app.use(helmet());

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000", // fallback
  process.env.FRONTEND_URL,
];

const corsOptions = {
  origin: (origin, callback) => {
    // requests with no Origin header (Thunder Client, curl, server-to-server) are allowed through,
    // since CORS is a browser-enforced mechanism and doesn't apply to those anyway
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
};

app.use(cors(corsOptions));

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests, please try again later." },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Too many login/signup attempts, please try again later.",
  },
});

app.use(generalLimiter);

app.use(express.json());
app.use(cookieParser());
app.use(csrfProtection);
app.use(logger);

// health check app itself, not one resource
app.get("/health", async (req, res) => {
  try {
    await db.query("SELECT 1");

    res.status(200).json({
      status: "ok",
      database: "connected",
    });
  } catch (error) {
    res.status(503).json({
      status: "error",
      database: "disconnected",
    });
  }
});

app.use("/auth", authLimiter, authRoutes);
app.use("/employees", employeeRoutes);
app.use("/departments", departmentRoutes);
app.use("/projects", projectRoutes);
app.use("/tasks", taskRoutes);
app.use(errorHandler);

const PORT = Number(process.env.PORT) || 8081;

const server = app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

const shutdown = async () => {
  console.log("Shutting down server...");

  server.close(async () => {
    console.log("HTTP server closed");

    await db.end();

    console.log("Database connection pool closed");

    process.exit(0);
  });
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
