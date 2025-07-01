const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: [
      'domain_registration',
      'domain_expiry',
      'dark_web_mention',
      'social_media_mention',
      'pastebin_mention',
      'password_breach',
      'ssl_expiry',
      'content_change',
      'threat_detected',
      'brand_abuse',
      'phishing_detected',
      'malware_detected'
    ],
    required: true
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  source: {
    type: String,
    required: true,
    trim: true
  },
  sourceUrl: {
    type: String,
    trim: true
  },
  metadata: {
    domain: String,
    ipAddress: String,
    country: String,
    detectedAt: Date,
    confidence: {
      type: Number,
      min: 0,
      max: 100
    },
    tags: [String],
    rawData: mongoose.Schema.Types.Mixed
  },
  status: {
    type: String,
    enum: ['new', 'acknowledged', 'investigating', 'resolved', 'false_positive'],
    default: 'new'
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  notes: [{
    content: String,
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  actions: [{
    action: {
      type: String,
      enum: ['email_sent', 'slack_notification', 'discord_notification', 'telegram_notification', 'notifications_sent', 'takedown_requested', 'investigation_started', 'resolved', 'status_updated']
    },
    description: String,
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    performedAt: {
      type: Date,
      default: Date.now
    },
    metadata: mongoose.Schema.Types.Mixed
  }],
  isRead: {
    type: Boolean,
    default: false
  },
  isArchived: {
    type: Boolean,
    default: false
  },
  expiresAt: {
    type: Date
  },
  relatedAlerts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Alert'
  }]
}, {
  timestamps: true
});

// Indexes for better query performance
alertSchema.index({ userId: 1, createdAt: -1 });
alertSchema.index({ type: 1 });
alertSchema.index({ severity: 1 });
alertSchema.index({ status: 1 });
alertSchema.index({ isRead: 1 });
alertSchema.index({ 'metadata.domain': 1 });
alertSchema.index({ expiresAt: 1 });

// TTL index for automatic cleanup of old alerts
alertSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 }); // 90 days

// Method to add note
alertSchema.methods.addNote = function(content, authorId) {
  this.notes.push({
    content,
    author: authorId,
    createdAt: new Date()
  });
  return this.save();
};

// Method to add action
alertSchema.methods.addAction = function(action, description, performedById, metadata = {}) {
  this.actions.push({
    action,
    description,
    performedBy: performedById,
    performedAt: new Date(),
    metadata
  });
  return this.save();
};

// Method to mark as read
alertSchema.methods.markAsRead = function() {
  this.isRead = true;
  return this.save();
};

// Method to update status
alertSchema.methods.updateStatus = function(status, userId) {
  this.status = status;
  this.addAction('status_updated', `Status changed to ${status}`, userId);
  return this.save();
};

// Static method to create alert
alertSchema.statics.createAlert = function(data) {
  return new this({
    userId: data.userId,
    type: data.type,
    severity: data.severity,
    title: data.title,
    message: data.message,
    source: data.source,
    sourceUrl: data.sourceUrl,
    metadata: data.metadata || {},
    expiresAt: data.expiresAt
  });
};

// Pre-save middleware to set default expiration
alertSchema.pre('save', function(next) {
  if (!this.expiresAt) {
    // Set expiration based on severity
    const expirationDays = {
      low: 30,
      medium: 60,
      high: 90,
      critical: 180
    };
    
    const days = expirationDays[this.severity] || 60;
    this.expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  }
  next();
});

module.exports = mongoose.model('Alert', alertSchema); 