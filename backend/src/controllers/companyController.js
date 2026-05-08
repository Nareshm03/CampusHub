const Company = require('../models/Company');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

// Configure multer for logo upload
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/company-logos');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'logo-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.jpg', '.jpeg', '.png', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images are allowed.'));
    }
  }
});

// Get all companies
exports.getAllCompanies = async (req, res) => {
  try {
    const { search, industry, isActive, page = 1, limit = 20 } = req.query;

    const query = {};

    if (search) {
      query.$text = { $search: search };
    }

    if (industry) {
      query.industry = industry;
    }

    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    const skip = (page - 1) * limit;

    const companies = await Company.find(query)
      .skip(skip)
      .limit(parseInt(limit))
      .populate('preferredDepartments', 'name')
      .populate('addedBy', 'name')
      .sort({ createdAt: -1 });

    const total = await Company.countDocuments(query);

    res.json({
      success: true,
      data: {
        companies,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get companies error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching companies',
      error: error.message
    });
  }
};

// Get company by ID
exports.getCompanyById = async (req, res) => {
  try {
    const { id } = req.params;

    const company = await Company.findById(id)
      .populate('preferredDepartments', 'name')
      .populate('addedBy', 'name');

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    res.json({
      success: true,
      data: company
    });
  } catch (error) {
    console.error('Get company error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching company',
      error: error.message
    });
  }
};

// Create company
exports.createCompany = [
  upload.single('logo'),
  async (req, res) => {
    try {
      const companyData = {
        ...req.body,
        addedBy: req.user._id
      };

      if (req.file) {
        companyData.logo = `/uploads/company-logos/${req.file.filename}`;
      }

      // Parse JSON fields
      if (req.body.address) {
        companyData.address = JSON.parse(req.body.address);
      }
      if (req.body.contactPerson) {
        companyData.contactPerson = JSON.parse(req.body.contactPerson);
      }
      if (req.body.preferredDepartments) {
        companyData.preferredDepartments = JSON.parse(req.body.preferredDepartments);
      }

      const company = new Company(companyData);
      await company.save();

      res.status(201).json({
        success: true,
        message: 'Company created successfully',
        data: company
      });
    } catch (error) {
      console.error('Create company error:', error);
      res.status(500).json({
        success: false,
        message: 'Error creating company',
        error: error.message
      });
    }
  }
];

// Update company
exports.updateCompany = async (req, res) => {
  try {
    const { id } = req.params;

    const company = await Company.findByIdAndUpdate(id, req.body, { new: true })
      .populate('preferredDepartments', 'name');

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    res.json({
      success: true,
      message: 'Company updated successfully',
      data: company
    });
  } catch (error) {
    console.error('Update company error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating company',
      error: error.message
    });
  }
};

// Delete company
exports.deleteCompany = async (req, res) => {
  try {
    const { id } = req.params;

    const company = await Company.findByIdAndDelete(id);

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    // Delete logo if exists
    if (company.logo) {
      try {
        const logoPath = path.join(__dirname, '../..', company.logo);
        await fs.unlink(logoPath);
      } catch (error) {
        console.error('Error deleting logo:', error);
      }
    }

    res.json({
      success: true,
      message: 'Company deleted successfully'
    });
  } catch (error) {
    console.error('Delete company error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting company',
      error: error.message
    });
  }
};

// Add campus visit
exports.addCampusVisit = async (req, res) => {
  try {
    const { id } = req.params;
    const visitData = req.body;

    const company = await Company.findById(id);

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    company.campusVisits.push(visitData);
    await company.save();

    res.json({
      success: true,
      message: 'Campus visit added successfully',
      data: company
    });
  } catch (error) {
    console.error('Add campus visit error:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding campus visit',
      error: error.message
    });
  }
};
