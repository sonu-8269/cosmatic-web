import { Category } from '../../models/Category.js';
import { Product } from '../../models/Product.js';
import { ApiResponse } from '../../utils/apiResponse.js';
import { ApiError } from '../../utils/apiError.js';

/**
 * Get active categories for Storefront (Hierarchical tree & flat list)
 */
export const getCustomerCategories = async (req, res, next) => {
  try {
    const categories = await Category.find({ isActive: true })
      .populate('parentCategory', 'name slug')
      .sort({ displayOrder: 1, name: 1 })
      .lean();

    // Build hierarchical tree: Top-level categories with their children
    const categoryMap = {};
    const rootCategories = [];

    categories.forEach((cat) => {
      categoryMap[cat._id.toString()] = { ...cat, subCategories: [] };
    });

    categories.forEach((cat) => {
      const catId = cat._id.toString();
      if (cat.parentCategory) {
        const parentId = cat.parentCategory._id.toString();
        if (categoryMap[parentId]) {
          categoryMap[parentId].subCategories.push(categoryMap[catId]);
        } else {
          rootCategories.push(categoryMap[catId]);
        }
      } else {
        rootCategories.push(categoryMap[catId]);
      }
    });

    res.status(200).json(
      new ApiResponse(
        200,
        {
          tree: rootCategories,
          list: categories,
        },
        'Categories retrieved successfully'
      )
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get category by slug for category-specific landing page
 */
export const getCategoryBySlug = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const category = await Category.findOne({ slug, isActive: true }).lean();

    if (!category) {
      throw new ApiError(404, 'Category not found');
    }

    const [subCategories, totalProducts] = await Promise.all([
      Category.find({ parentCategory: category._id, isActive: true })
        .sort({ displayOrder: 1 })
        .lean(),
      Product.countDocuments({ category: category._id, isActive: true }),
    ]);

    res.status(200).json(
      new ApiResponse(
        200,
        {
          category,
          subCategories,
          totalProducts,
        },
        'Category details retrieved'
      )
    );
  } catch (error) {
    next(error);
  }
};
