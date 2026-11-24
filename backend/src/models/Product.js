import mongoose from 'mongoose';

const variantSchema = new mongoose.Schema({
  title: { type: String, required: true }, // e.g., '50ml', '100ml', 'Shade 01 Ivory'
  sku: { type: String, required: true },
  price: { type: Number, required: true },
  mrp: { type: Number, required: true },
  stock: { type: Number, default: 0 },
});

const imageSchema = new mongoose.Schema({
  url: { type: String, required: true },
  publicId: { type: String, default: '' },
  isPrimary: { type: Boolean, default: false },
});

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      required: true,
    },
    brand: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
      index: true,
    },
    /**
     * CRITICAL SECURITY REQUIREMENT:
     * buyingPrice is configured with `select: false`.
     * Customer APIs will NEVER receive this field.
     * Only Admin controllers can explicitly include it via `.select('+buyingPrice')`.
     */
    buyingPrice: {
      type: Number,
      required: true,
      select: false,
    },
    mrp: {
      type: Number,
      required: true,
    },
    sellingPrice: {
      type: Number,
      required: true,
      index: true,
    },
    discount: {
      type: Number,
      default: 0,
    },
    stock: {
      type: Number,
      default: 0,
    },
    sku: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    variants: [variantSchema],
    ingredients: [
      {
        type: String,
        trim: true,
      },
    ],
    skinType: [
      {
        type: String,
        enum: ['All', 'Oily', 'Dry', 'Combination', 'Sensitive', 'Normal'],
        default: ['All'],
      },
    ],
    hairType: [
      {
        type: String,
        enum: ['All', 'Straight', 'Wavy', 'Curly', 'Coily', 'Dry', 'Oily'],
        default: ['All'],
      },
    ],
    images: {
      type: [imageSchema],
      validate: [
        (val) => val.length <= 8,
        'A product can have a maximum of 8 images.',
      ],
    },
    videoUrl: {
      type: String,
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
      index: true,
    },
    averageRating: {
      type: Number,
      default: 0,
    },
    reviewsCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc, ret, options) {
        // Only keep buyingPrice if explicitly allowed in admin serialization options
        if (!options || !options.includeBuyingPrice) {
          delete ret.buyingPrice;
        }
        return ret;
      },
    },
    toObject: {
      transform: function (doc, ret, options) {
        if (!options || !options.includeBuyingPrice) {
          delete ret.buyingPrice;
        }
        return ret;
      },
    },
  }
);

productSchema.index({ name: 'text', description: 'text', brand: 'text' });

export const Product = mongoose.model('Product', productSchema);
