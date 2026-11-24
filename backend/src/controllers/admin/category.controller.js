import { Category } from '../../models/Category.js';
import { Product } from '../../models/Product.js';
import { uploadBufferToCloudinary, deleteFromCloudinary } from '../../services/media.service.js';
import { slugify } from '../../utils/slugify.js';
import { ApiResponse } from '../../utils/apiResponse.js';
import { ApiError } from '../../utils/apiError.js';
import { recordActivity } from '../../middlewares/activityLog.middleware.js';

/**
 * Create a new Category (supports image upload)
 */
export const createCategory = async (req, res, next) => {
  try {
    const { name, description, parentCategory, isActive, displayOrder } = req.body;
    let { slug } = req.body;

    if (!slug) {
      slug = slugify(name);
    } else {
      slug = slugify(slug);
    }

    // Ensure slug uniqueness
    const existingSlug = await Category.findOne({ slug });
    if (existingSlug) {
      slug = `${slug}-${Date.now().toString().slice(-4)}`;
    }

    let image = null;
    if (req.file) {
      const uploadRes = await uploadBufferToCloudinary(req.file.buffer, {
        folder: 'cosmatics/categories',
      });
      image = {
        url: uploadRes.url,
        publicId: uploadRes.publicId,
      };
    }

    const category = await Category.create({
      name,
      slug,
      description: description || '',
      parentCategory: parentCategory || null,
      isActive: isActive !== undefined ? isActive : true,
      displayOrder: displayOrder || 0,
      image,
    });

    await recordActivity({
      req,
      module: 'categories',
      action: 'create',
      description: `Created category: ${category.name} (${category.slug})`,
      metadata: { categoryId: category._id },
    });

    res.status(201).json(new ApiResponse(201, category, 'Category created successfully'));
  } catch (error) {
    next(error);
  }
};

/**
 * Get all Categories for Admin/Staff (flat list with parent details)
 */
export const getAdminCategories = async (req, res, next) => {
  try {
    const { search, isActive } = req.query;
    const filter = {};

    if (search) {
      filter.name = { $regex: search, $options: 'i' };
    }

    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }

    const categories = await Category.find(filter)
      .populate('parentCategory', 'name slug')
      .sort({ displayOrder: 1, name: 1 });

    res.status(200).json(new ApiResponse(200, categories, 'Categories retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

/**
 * Get single category by ID
 */
export const getCategoryById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const category = await Category.findById(id).populate('parentCategory', 'name slug');

    if (!category) {
      throw new ApiError(404, 'Category not found');
    }

    res.status(200).json(new ApiResponse(200, category, 'Category retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

/**
 * Update an existing category
 */
export const updateCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, parentCategory, isActive, displayOrder, slug } = req.body;

    const category = await Category.findById(id);
    if (!category) {
      throw new ApiError(404, 'Category not found');
    }

    if (name) category.name = name;
    if (description !== undefined) category.description = description;
    if (parentCategory !== undefined) category.parentCategory = parentCategory || null;
    if (isActive !== undefined) category.isActive = isActive;
    if (displayOrder !== undefined) category.displayOrder = displayOrder;

    if (slug && slug !== category.slug) {
      const cleanSlug = slugify(slug);
      const existing = await Category.findOne({ slug: cleanSlug, _id: { $ne: id } });
      if (existing) {
        throw new ApiError(400, 'Another category already exists with this slug.');
      }
      category.slug = cleanSlug;
    }

    // Handle new image upload
    if (req.file) {
      if (category.image?.publicId) {
        await deleteFromCloudinary(category.image.publicId);
      }
      const uploadRes = await uploadBufferToCloudinary(req.file.buffer, {
        folder: 'cosmatics/categories',
      });
      category.image = {
        url: uploadRes.url,
        publicId: uploadRes.publicId,
      };
    }

    await category.save();

    await recordActivity({
      req,
      module: 'categories',
      action: 'edit',
      description: `Updated category: ${category.name}`,
      metadata: { categoryId: category._id },
    });

    res.status(200).json(new ApiResponse(200, category, 'Category updated successfully'));
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a category
 */
export const deleteCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const category = await Category.findById(id);

    if (!category) {
      throw new ApiError(404, 'Category not found');
    }

    // Check if any product is assigned to this category
    const associatedProducts = await Product.countDocuments({ category: id });
    if (associatedProducts > 0) {
      throw new ApiError(
        400,
        `Cannot delete category. ${associatedProducts} product(s) are currently assigned to it.`
      );
    }

    // Check if it has child categories
    const subCategories = await Category.countDocuments({ parentCategory: id });
    if (subCategories > 0) {
      throw new ApiError(
        400,
        `Cannot delete category. It contains ${subCategories} sub-category/sub-categories.`
      );
    }

    // Delete image from Cloudinary
    if (category.image?.publicId) {
      await deleteFromCloudinary(category.image.publicId);
    }

    await Category.findByIdAndDelete(id);

    await recordActivity({
      req,
      module: 'categories',
      action: 'delete',
      description: `Deleted category: ${category.name}`,
      metadata: { categoryId: id },
    });

    res.status(200).json(new ApiResponse(200, null, 'Category deleted successfully'));
  } catch (error) {
    next(error);
  }
};
