import { z } from 'zod';

const parseJsonIfString = (val) => {
  if (typeof val === 'string') {
    try {
      return JSON.parse(val);
    } catch {
      return val;
    }
  }
  return val;
};

export const createProductSchema = {
  body: z.object({
    name: z.string().min(2, 'Product name must be at least 2 characters').trim(),
    slug: z.string().optional(),
    description: z.string().min(10, 'Product description must be at least 10 characters'),
    brand: z.string().min(2, 'Brand name is required').trim(),
    category: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Valid Category ID is required'),
    buyingPrice: z
      .union([z.number(), z.string().transform((v) => parseFloat(v))])
      .refine((v) => v >= 0, 'Buying price must be greater than or equal to 0'),
    mrp: z
      .union([z.number(), z.string().transform((v) => parseFloat(v))])
      .refine((v) => v > 0, 'MRP must be greater than 0'),
    sellingPrice: z
      .union([z.number(), z.string().transform((v) => parseFloat(v))])
      .refine((v) => v > 0, 'Selling price must be greater than 0'),
    discount: z
      .union([z.number(), z.string().transform((v) => parseFloat(v))])
      .optional()
      .default(0),
    stock: z
      .union([z.number(), z.string().transform((v) => parseInt(v, 10))])
      .optional()
      .default(0),
    sku: z.string().min(3, 'SKU code is required').trim().toUpperCase(),
    variants: z
      .preprocess(parseJsonIfString, z.array(z.object({
        title: z.string(),
        sku: z.string(),
        price: z.number(),
        mrp: z.number(),
        stock: z.number().default(0),
      })))
      .optional()
      .default([]),
    ingredients: z
      .preprocess(parseJsonIfString, z.array(z.string()))
      .optional()
      .default([]),
    skinType: z
      .preprocess(parseJsonIfString, z.array(z.enum(['All', 'Oily', 'Dry', 'Combination', 'Sensitive', 'Normal'])))
      .optional()
      .default(['All']),
    hairType: z
      .preprocess(parseJsonIfString, z.array(z.enum(['All', 'Straight', 'Wavy', 'Curly', 'Coily', 'Dry', 'Oily'])))
      .optional()
      .default(['All']),
    videoUrl: z.string().optional().default(''),
    isActive: z
      .union([z.boolean(), z.string().transform((val) => val === 'true')])
      .optional()
      .default(true),
    isFeatured: z
      .union([z.boolean(), z.string().transform((val) => val === 'true')])
      .optional()
      .default(false),
  }),
};

export const updateProductSchema = {
  body: z.object({
    name: z.string().min(2).trim().optional(),
    slug: z.string().optional(),
    description: z.string().min(10).optional(),
    brand: z.string().min(2).trim().optional(),
    category: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
    buyingPrice: z
      .union([z.number(), z.string().transform((v) => parseFloat(v))])
      .optional(),
    mrp: z
      .union([z.number(), z.string().transform((v) => parseFloat(v))])
      .optional(),
    sellingPrice: z
      .union([z.number(), z.string().transform((v) => parseFloat(v))])
      .optional(),
    discount: z
      .union([z.number(), z.string().transform((v) => parseFloat(v))])
      .optional(),
    stock: z
      .union([z.number(), z.string().transform((v) => parseInt(v, 10))])
      .optional(),
    sku: z.string().min(3).trim().toUpperCase().optional(),
    variants: z
      .preprocess(parseJsonIfString, z.array(z.any()))
      .optional(),
    ingredients: z
      .preprocess(parseJsonIfString, z.array(z.string()))
      .optional(),
    skinType: z
      .preprocess(parseJsonIfString, z.array(z.string()))
      .optional(),
    hairType: z
      .preprocess(parseJsonIfString, z.array(z.string()))
      .optional(),
    videoUrl: z.string().optional(),
    isActive: z
      .union([z.boolean(), z.string().transform((val) => val === 'true')])
      .optional(),
    isFeatured: z
      .union([z.boolean(), z.string().transform((val) => val === 'true')])
      .optional(),
    removeImagePublicIds: z
      .preprocess(parseJsonIfString, z.array(z.string()))
      .optional(),
    primaryImagePublicId: z.string().optional(),
  }),
};

export const customerProductQuerySchema = {
  query: z.object({
    search: z.string().optional(),
    category: z.string().optional(),
    brand: z.string().optional(),
    skinType: z.string().optional(),
    hairType: z.string().optional(),
    minPrice: z.string().transform((v) => parseFloat(v)).optional(),
    maxPrice: z.string().transform((v) => parseFloat(v)).optional(),
    inStock: z.string().transform((v) => v === 'true').optional(),
    isFeatured: z.string().transform((v) => v === 'true').optional(),
    sort: z.enum(['price-asc', 'price-desc', 'newest', 'popular', 'discount']).optional().default('newest'),
    page: z.string().transform((v) => parseInt(v, 10)).optional().default('1'),
    limit: z.string().transform((v) => parseInt(v, 10)).optional().default('12'),
  }),
};
