import { z } from 'zod';

export const createCategorySchema = {
  body: z.object({
    name: z.string().min(2, 'Category name must be at least 2 characters').trim(),
    slug: z.string().optional(),
    description: z.string().optional().default(''),
    parentCategory: z
      .string()
      .regex(/^[0-9a-fA-F]{24}$/, 'Invalid Parent Category ID')
      .nullable()
      .optional(),
    isActive: z
      .union([z.boolean(), z.string().transform((val) => val === 'true')])
      .optional()
      .default(true),
    displayOrder: z
      .union([z.number(), z.string().transform((val) => parseInt(val, 10))])
      .optional()
      .default(0),
  }),
};

export const updateCategorySchema = {
  body: z.object({
    name: z.string().min(2).trim().optional(),
    slug: z.string().optional(),
    description: z.string().optional(),
    parentCategory: z
      .string()
      .regex(/^[0-9a-fA-F]{24}$/, 'Invalid Parent Category ID')
      .nullable()
      .optional(),
    isActive: z
      .union([z.boolean(), z.string().transform((val) => val === 'true')])
      .optional(),
    displayOrder: z
      .union([z.number(), z.string().transform((val) => parseInt(val, 10))])
      .optional(),
  }),
};
