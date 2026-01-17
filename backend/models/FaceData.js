const mongoose = require('mongoose');

const FaceDataSchema = new mongoose.Schema(
  {
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true
    },
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
      index: true
    },
    // Base64 encoded face image data or S3 URL
    faceImageData: {
      type: String,
      required: true
    },
    // Optional: Store embedding vector if using ML model
    faceEmbedding: {
      type: [Number],
      default: null
    },
    // Face encoding/features
    faceDescriptor: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    // Quality metrics
    quality: {
      sharpness: {
        type: Number,
        min: 0,
        max: 100,
        default: null
      },
      brightness: {
        type: Number,
        min: 0,
        max: 100,
        default: null
      },
      contrast: {
        type: Number,
        min: 0,
        max: 100,
        default: null
      },
      confidence: {
        type: Number,
        min: 0,
        max: 100,
        default: null
      }
    },
    // Registration metadata
    registeredAt: {
      type: Date,
      default: Date.now
    },
    registeredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    registrationNotes: String,
    // Face detection data
    faceBox: {
      x: Number,
      y: Number,
      width: Number,
      height: Number
    },
    // Landmarks
    landmarks: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    // Status and verification
    status: {
      type: String,
      enum: ['active', 'inactive', 'rejected', 'pending_review'],
      default: 'active'
    },
    isVerified: {
      type: Boolean,
      default: false
    },
    verifiedAt: Date,
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    // Audit trail
    lastUsedFor: {
      type: String,
      enum: ['attendance', 'access_control', 'both'],
      default: 'attendance'
    },
    lastUsedAt: Date,
    usageCount: {
      type: Number,
      default: 0
    },
    // Backup images (for reference)
    backupImages: [
      {
        imageData: String,
        uploadedAt: Date
      }
    ],
    // Metadata
    deviceInfo: {
      type: String
    },
    browser: String,
    ipAddress: String,
    // Version tracking
    version: {
      type: Number,
      default: 1
    }
  },
  {
    timestamps: true,
    collection: 'facedata'
  }
);

// Compound index for fast lookups
FaceDataSchema.index({ tenant: 1, employee: 1 });
FaceDataSchema.index({ tenant: 1, status: 1 });
FaceDataSchema.index({ employee: 1, isVerified: 1 });

module.exports = FaceDataSchema;
