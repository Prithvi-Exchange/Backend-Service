// src/routes/documentUpload.js

const express = require('express');
const router = express.Router();
const { uploadFiles } = require('../../middleware/upload/upload');
const { successResponse, errorResponse } = require('../../middleware/response/responseFormatter'); // import formatter

router.post('/upload-documents', uploadFiles, (req, res) => {
  try {
    return successResponse(res, req.files, 'Files uploaded successfully!');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

module.exports = router;
