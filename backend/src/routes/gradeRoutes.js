const express = require('express');
const { calculateGrades, generateTranscript, calculateMyGrades } = require('../controllers/gradeController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * /api/grades/calculate/me:
 *   get:
 *     summary: Calculate GPA/CGPA for logged-in student
 *     tags: [Grades]
 *     parameters:
 *       - in: query
 *         name: semester
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Grades calculated successfully
 */
router.get('/calculate/me', protect, authorize('STUDENT'), calculateMyGrades);

/**
 * @swagger
 * /api/v1/grades/calculate/{studentId}:
 *   get:
 *     summary: Calculate GPA/CGPA for student
 *     tags: [Grades]
 *     parameters:
 *       - in: path
 *         name: studentId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: semester
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Grades calculated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 */
router.get('/calculate/:studentId', protect, calculateGrades);

/**
 * @swagger
 * /api/v1/grades/transcript/{studentId}:
 *   get:
 *     summary: Generate student transcript
 *     tags: [Grades]
 *     parameters:
 *       - in: path
 *         name: studentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Transcript generated successfully
 */
router.get('/transcript/:studentId', protect, generateTranscript);

module.exports = router;