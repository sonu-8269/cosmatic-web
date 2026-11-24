import mongoose from 'mongoose';

const settingSchema = new mongoose.Schema(
  {
    siteName: {
      type: String,
      default: 'Cosmetics Store',
    },
    siteLogo: {
      type: String,
      default: '',
    },
    contactEmail: {
      type: String,
      default: 'support@cosmatics.com',
    },
    contactPhone: {
      type: String,
      default: '+91 9876543210',
    },
    shippingCharge: {
      type: Number,
      default: 50,
    },
    freeShippingThreshold: {
      type: Number,
      default: 999,
    },
    gstPercentage: {
      type: Number,
      default: 18,
    },
  },
  { timestamps: true }
);

export const Setting = mongoose.model('Setting', settingSchema);
