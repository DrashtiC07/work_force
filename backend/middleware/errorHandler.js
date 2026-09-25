const errorHandler = (err, req, res, next) => {
  console.error("Unhandled error:", err);

  if (err.code === "ER_DUP_ENTRY") {
    return res.status(409).json({
      message: "Duplicate value",
    });
  }

  if (err.status) {
    return res.status(err.status).json({
      message: err.message,
    });
  }

  res.status(500).json({
    message: "Something went wrong on the server",
  });
};

module.exports = errorHandler;
