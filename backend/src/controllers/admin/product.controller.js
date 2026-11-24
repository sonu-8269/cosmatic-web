import { Product } from '../../models/Product.js';
import { Category } from '../../models/Category.js';
import {
  uploadMultipleBuffers,
  deleteFromCloudinary,
} from '../../services/media.service.js';
import { slugify } from '../../utils/slugify.js';
import { ApiResponse } from '../../utils/apiResponse.js';
import { ApiError } from '../../utils/apiError.js';
import { recordActivity } from '../../middlewares/activityLog.middleware.js';

/**
 * Helper to ensure buyingPrice is included in Admin serialization
 */
const serializeAdminProduct = (productDoc) => {
  if (!productDoc) return null;
  return productDoc.toObject
    ? productDoc.toObject({ includeBuyingPrice: true })
    : productDoc;
};

/**
 * Create a new Product (with multiple images upload up to 8 images)
 */
export const createProduct = async (req, res, next) => {
  try {
    const {
      name,
      description,
      brand,
      category,
      buyingPrice,
      mrp,
      sellingPrice,
      discount,
      stock,
      sku,
      variants,
      ingredients,
      skinType,
      hairType,
      videoUrl,
      isActive,
      isFeatured,
    } = req.body;

    // Check SKU uniqueness
    const existingSku = await Product.findOne({ sku: sku.toUpperCase() });
    if (existingSku) {
      throw new ApiError(400, `SKU '${sku}' already exists. Please use a unique SKU.`);
    }

    // Verify category exists
    const categoryExists = await Category.findById(category);
    if (!categoryExists) {
      throw new ApiError(404, 'Selected category does not exist.');
    }

    // Generate unique slug
    let slug = req.body.slug ? slugify(req.body.slug) : slugify(name);
    const existingSlug = await Product.findOne({ slug });
    if (existingSlug) {
      slug = `${slug}-${Date.now().toString().slice(-4)}`;
    }

    // Process uploaded images
    let images = [];
    if (req.files && req.files.length > 0) {
      if (req.files.length > 8) {
        throw new ApiError(400, 'A maximum of 8 images can be uploaded for a product.');
      }
      const uploadedFiles = await uploadMultipleBuffers(req.files, {
        folder: 'cosmatics/products',
      });
      images = uploadedFiles.map((item, index) => ({
        url: item.url,
        publicId: item.publicId,
        isPrimary: index === 0, // First image primary by default
      }));
    }

    // Auto calculate discount if not provided
    const calculatedDiscount =
      discount !== undefined && discount !== null
        ? discount
        : mrp > sellingPrice
        ? Math.round(((mrp - sellingPrice) / mrp) * 100)
        : 0;

    const product = await Product.create({
      name,
      slug,
      description,
      brand,
      category,
      buyingPrice, // Saved in database
      mrp,
      sellingPrice,
      discount: calculatedDiscount,
      stock: stock || 0,
      sku: sku.toUpperCase(),
      variants: variants || [],
      ingredients: ingredients || [],
      skinType: skinType || ['All'],
      hairType: hairType || ['All'],
      images,
      videoUrl: videoUrl || '',
      isActive: isActive !== undefined ? isActive : true,
      isFeatured: isFeatured !== undefined ? isFeatured : false,
    });

    await recordActivity({
      req,
      module: 'products',
      action: 'create',
      description: `Created product: ${product.name} (SKU: ${product.sku})`,
      metadata: { productId: product._id },
    });

    res
      .status(201)
      .json(
        new ApiResponse(
          201,
          serializeAdminProduct(product),
          'Product created successfully'
        )
      );
  } catch (error) {
    next(error);
  }
};

/**
 * Get all Products for Admin / Staff
 * CRITICAL: Admin view explicitly selects '+buyingPrice'
 */
export const getAdminProducts = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      category,
      brand,
      isActive,
      stockStatus,
    } = req.query;

    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
      ];
    }

    if (category) query.category = category;
    if (brand) query.brand = brand;
    if (isActive !== undefined) query.isActive = isActive === 'true';

    if (stockStatus === 'low') {
      query.stock = { $gt: 0, $lte: 10 };
    } else if (stockStatus === 'out') {
      query.stock = 0;
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const [products, total] = await Promise.all([
      Product.find(query)
        .select('+buyingPrice') // Include buyingPrice for Admin
        .populate('category', 'name slug')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit, 10)),
      Product.countDocuments(query),
    ]);

    const adminProducts = products.map((p) => serializeAdminProduct(p));

    res.status(200).json(
      new ApiResponse(
        200,
        {
          products: adminProducts,
          pagination: {
            page: parseInt(page, 10),
            limit: parseInt(limit, 10),
            total,
            totalPages: Math.ceil(total / parseInt(limit, 10)),
          },
        },
        'Products retrieved successfully'
      )
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get single product by ID (Admin view with buyingPrice)
 */
export const getAdminProductById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id)
      .select('+buyingPrice')
      .populate('category', 'name slug');

    if (!product) {
      throw new ApiError(404, 'Product not found');
    }

    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          serializeAdminProduct(product),
          'Product details retrieved'
        )
      );
  } catch (error) {
    next(error);
  }
};

/**
 * Update an existing Product
 */
export const updateProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id).select('+buyingPrice');

    if (!product) {
      throw new ApiError(404, 'Product not found');
    }

    const {
      name,
      slug,
      description,
      brand,
      category,
      buyingPrice,
      mrp,
      sellingPrice,
      discount,
      stock,
      sku,
      variants,
      ingredients,
      skinType,
      hairType,
      videoUrl,
      isActive,
      isFeatured,
      removeImagePublicIds,
      primaryImagePublicId,
    } = req.body;

    // Check SKU uniqueness if changed
    if (sku && sku.toUpperCase() !== product.sku) {
      const existing = await Product.findOne({ sku: sku.toUpperCase(), _id: { $ne: id } });
      if (existing) {
        throw new ApiError(400, `SKU '${sku}' is already assigned to another product.`);
      }
      product.sku = sku.toUpperCase();
    }

    if (category && category !== product.category.toString()) {
      const categoryExists = await Category.findById(category);
      if (!categoryExists) throw new ApiError(404, 'Category does not exist.');
      product.category = category;
    }

    if (name) product.name = name;
    if (description) product.description = description;
    if (brand) product.brand = brand;
    if (buyingPrice !== undefined) product.buyingPrice = buyingPrice;
    if (mrp !== undefined) product.mrp = mrp;
    if (sellingPrice !== undefined) product.sellingPrice = sellingPrice;
    if (stock !== undefined) product.stock = stock;
    if (videoUrl !== undefined) product.videoUrl = videoUrl;
    if (isActive !== undefined) product.isActive = isActive;
    if (isFeatured !== undefined) product.isFeatured = isFeatured;
    if (variants !== undefined) product.variants = variants;
    if (ingredients !== undefined) product.ingredients = ingredients;
    if (skinType !== undefined) product.skinType = skinType;
    if (hairType !== undefined) product.hairType = hairType;

    // Recalculate discount
    if (discount !== undefined) {
      product.discount = discount;
    } else if (product.mrp > product.sellingPrice) {
      product.discount = Math.round(((product.mrp - product.sellingPrice) / product.mrp) * 100);
    }

    if (slug && slug !== product.slug) {
      const cleanSlug = slugify(slug);
      const existing = await Product.findOne({ slug: cleanSlug, _id: { $ne: id } });
      if (existing) {
        throw new ApiError(400, 'Another product already has this slug.');
      }
      product.slug = cleanSlug;
    }

    // Handle removing specified images
    if (removeImagePublicIds && Array.isArray(removeImagePublicIds)) {
      for (const publicId of removeImagePublicIds) {
        await deleteFromCloudinary(publicId);
      }
      product.images = product.images.filter(
        (img) => !removeImagePublicIds.includes(img.publicId)
      );
    }

    // Handle new image uploads
    if (req.files && req.files.length > 0) {
      const totalImagesAfterUpload = product.images.length + req.files.length;
      if (totalImagesAfterUpload > 8) {
        throw new ApiError(
          400,
          `Cannot upload ${req.files.length} images. Product already has ${product.images.length} images (maximum 8 allowed).`
        );
      }
      const uploadedFiles = await uploadMultipleBuffers(req.files, {
        folder: 'cosmatics/products',
      });
      const newImages = uploadedFiles.map((item) => ({
        url: item.url,
        publicId: item.publicId,
        isPrimary: false,
      }));
      product.images.push(...newImages);
    }

    // Ensure at least one image is marked primary
    if (primaryImagePublicId) {
      product.images.forEach((img) => {
        img.isPrimary = img.publicId === primaryImagePublicId;
      });
    } else if (product.images.length > 0 && !product.images.some((img) => img.isPrimary)) {
      product.images[0].isPrimary = true;
    }

    await product.save();

    await recordActivity({
      req,
      module: 'products',
      action: 'edit',
      description: `Updated product: ${product.name} (SKU: ${product.sku})`,
      metadata: { productId: product._id },
    });

    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          serializeAdminProduct(product),
          'Product updated successfully'
        )
      );
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a Product
 */
export const deleteProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id);

    if (!product) {
      throw new ApiError(404, 'Product not found');
    }

    // Clean up images from Cloudinary
    if (product.images && product.images.length > 0) {
      for (const img of product.images) {
        if (img.publicId) {
          await deleteFromCloudinary(img.publicId);
        }
      }
    }

    await Product.findByIdAndDelete(id);

    await recordActivity({
      req,
      module: 'products',
      action: 'delete',
      description: `Deleted product: ${product.name} (SKU: ${product.sku})`,
      metadata: { productId: id },
    });

    res.status(200).json(new ApiResponse(200, null, 'Product deleted successfully'));
  } catch (error) {
    next(error);
  }
};
