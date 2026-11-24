import mongoose from 'mongoose';

const bannerSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    desktopImage: {
      type: String,
      required: true, // Recommended: 1920x700
    },
    mobileImage: {
      type: String,
      required: true, // Recommended: 800x1000
    },
    link: {
      type: String,
      default: '',
    },
    bannerType: {
      type: String,
      enum: ['HERO_SLIDER', 'HERO_VIDEO', 'PROMO_STRIP', 'CATEGORY_HIGHLIGHT'],
      default: 'HERO_SLIDER',
    },
    heroVideoUrl: {
      type: String,
      default: '', // 10-15s loop MP4, < 3MB
    },
    displayOrder: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export const Banner = mongoose.model('Banner', bannerSchema);
