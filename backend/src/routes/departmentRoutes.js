const express = require('express');
const {
  createDepartment,
  getAllDepartments,
  updateDepartment,
  deleteDepartment
} = require('../controllers/departmentController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router
  .route('/')
  .post(protect, authorize('ADMIN'), createDepartment)
  .get(protect, getAllDepartments);

router
  .route('/:id')
  .put(protect, authorize('ADMIN'), updateDepartment)
  .delete(protect, authorize('ADMIN'), deleteDepartment);

module.exports = router;