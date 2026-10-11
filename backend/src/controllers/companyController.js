const Company = require('../models/Company');
const mongoose = require('mongoose');
const { uploadFor, singleUpload } = require('../utils/stagedUpload');
const {
  getStorage,
  persistStagedFile,
  discardStagedFiles,
  parseStoredRef,
} = require('../utils/storage');

// Staged logo upload (2MB images). The controller persists the staged file
// through the storage adapter; validation is unchanged.
const upload = uploadFor('company-logos');

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
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid company ID format' });
    }

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
  singleUpload(upload.single('logo')),
  async (req, res) => {
    try {
      const companyData = {
        ...req.body,
        addedBy: req.user._id
      };

      let savedLogo = null;
      if (req.file) {
        const { storage, config } = getStorage();
        try {
          savedLogo = await persistStagedFile(storage, config, {
            category: 'company-logos',
            stagedPath: req.file.path,
            originalName: req.file.originalname,
            mimetype: req.file.mimetype,
          });
        } catch (err) {
          discardStagedFiles([req.file]);
          return res.status(err.status || 500).json({
            success: false,
            message: err.message || 'Error uploading company logo',
          });
        }
        companyData.logo = `/uploads/company-logos/${savedLogo.filename}`;
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
      try {
        await company.save();
      } catch (dbError) {
        // Compensate: DB write failed after the logo was stored.
        if (savedLogo) {
          try {
            const { storage } = getStorage();
            await storage.delete({ category: 'company-logos', filename: savedLogo.filename });
          } catch (_) {}
        }
        throw dbError;
      }

      res.status(201).json({
        success: true,
        message: 'Company created successfully',
        data: company
      });
  } catch (error) {
    console.error('Create company error:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        error: Object.values(error.errors).map((e) => e.message).join(', ')
      });
    }
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
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid company ID format' });
    }

    const company = await Company.findByIdAndUpdate(id, req.body, { new: true, runValidators: true })
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
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        error: Object.values(error.errors).map((e) => e.message).join(', ')
      });
    }
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
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid company ID format' });
    }

    const company = await Company.findByIdAndDelete(id);

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    // Delete logo if exists (missing objects are fine).
    if (company.logo) {
      try {
        const ref = parseStoredRef(company.logo);
        if (ref) {
          const { storage } = getStorage();
          await storage.delete({ category: ref.category, filename: ref.filename });
        }
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
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid company ID format' });
    }

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
