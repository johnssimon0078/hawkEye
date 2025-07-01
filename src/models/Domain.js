const mongoose = require('mongoose');

const domainSchema = new mongoose.Schema({
  domain: {
    type: String,
    required: [true, 'Domain is required'],
    trim: true,
    lowercase: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active'
  },
  monitoringType: {
    type: String,
    enum: ['typosquatting', 'brand_abuse', 'phishing', 'malware', 'all'],
    default: 'all'
  },
  riskLevel: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'low'
  },
  registrationDate: {
    type: Date
  },
  expirationDate: {
    type: Date
  },
  registrar: {
    type: String,
    trim: true
  },
  nameServers: [{
    type: String,
    trim: true
  }],
  ipAddress: {
    type: String,
    trim: true
  },
  country: {
    type: String,
    trim: true
  },
  sslCertificate: {
    issuer: String,
    validFrom: Date,
    validTo: Date,
    isValid: Boolean
  },
  contentAnalysis: {
    title: String,
    description: String,
    keywords: [String],
    hasBrandMentions: Boolean,
    hasSuspiciousContent: Boolean,
    lastAnalyzed: Date
  },
  threatIndicators: [{
    type: {
      type: String,
      enum: ['malware', 'phishing', 'spam', 'suspicious_redirect', 'other']
    },
    description: String,
    confidence: {
      type: Number,
      min: 0,
      max: 100
    },
    detectedAt: {
      type: Date,
      default: Date.now
    },
    source: String
  }],
  monitoringHistory: [{
    checkDate: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['online', 'offline', 'redirecting', 'error']
    },
    responseTime: Number,
    changes: [{
      field: String,
      oldValue: String,
      newValue: String,
      changeDate: {
        type: Date,
        default: Date.now
      }
    }]
  }],
  alerts: [{
    type: {
      type: String,
      enum: ['registration', 'content_change', 'ssl_expiry', 'threat_detected', 'status_change']
    },
    message: String,
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical']
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    isRead: {
      type: Boolean,
      default: false
    }
  }],
  tags: [{
    type: String,
    trim: true
  }],
  notes: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Indexes for better query performance
domainSchema.index({ domain: 1, userId: 1 });
domainSchema.index({ status: 1 });
domainSchema.index({ riskLevel: 1 });
domainSchema.index({ 'alerts.createdAt': -1 });
domainSchema.index({ 'monitoringHistory.checkDate': -1 });

// Virtual for domain age
domainSchema.virtual('age').get(function() {
  if (!this.registrationDate) return null;
  return Math.floor((Date.now() - this.registrationDate.getTime()) / (1000 * 60 * 60 * 24));
});

// Virtual for days until expiration
domainSchema.virtual('daysUntilExpiration').get(function() {
  if (!this.expirationDate) return null;
  return Math.floor((this.expirationDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
});

// Method to add alert
domainSchema.methods.addAlert = function(type, message, severity = 'medium') {
  const newAlert = {
    type,
    message,
    severity,
    createdAt: new Date()
  };
  
  // Use findOneAndUpdate to avoid version conflicts
  return this.constructor.findOneAndUpdate(
    { _id: this._id },
    { $push: { alerts: newAlert } },
    { new: true }
  );
};

// Method to mark alerts as read
domainSchema.methods.markAlertsAsRead = function() {
  // Use findOneAndUpdate to avoid version conflicts
  return this.constructor.findOneAndUpdate(
    { _id: this._id },
    { $set: { 'alerts.$[].isRead': true } },
    { new: true }
  );
};

// Method to add monitoring record
domainSchema.methods.addMonitoringRecord = function(status, responseTime, changes = []) {
  const newRecord = {
    checkDate: new Date(),
    status,
    responseTime,
    changes
  };
  
  // Use findOneAndUpdate to avoid version conflicts
  return this.constructor.findOneAndUpdate(
    { _id: this._id },
    { 
      $push: { 
        monitoringHistory: {
          $each: [newRecord],
          $slice: -100 // Keep only last 100 records
        }
      }
    },
    { new: true }
  );
};

module.exports = mongoose.model('Domain', domainSchema); 