import { Product } from '../../models/Product.js';
import { Category } from '../../models/Category.js';
import { ApiResponse } from '../../utils/apiResponse.js';
import { ApiError } from '../../utils/apiError.js';

/**
 * Storefront: Get active products list with rich filters, search, sort, and pagination
 * CRITICAL: buyingPrice is NEVER included in customer responses
 */
export const getCustomerProducts = async (req, res, next) => {
  try {
    const {
      search,
      category,
      brand,
      skinType,
      hairType,
      minPrice,
      maxPrice,
      inStock,
      isFeatured,
      sort = 'newest',
      page = 1,
      limit = 12,
    } = req.query;

    const filter = { isActive: true };

    // Search by text query
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    // Filter by Category (accepts category slug or ObjectId)
    if (category) {
      if (category.match(/^[0-9a-fA-F]{24}$/)) {
        filter.category = category;
      } else {
        const catDoc = await Category.findOne({ slug: category, isActive: true });
        if (catDoc) {
          // Include products in this category or its direct child sub-categories
          const subCats = await Category.find({ parentCategory: catDoc._id, isActive: true });
          const categoryIds = [catDoc._id, ...subCats.map((s) => s._id)];
          filter.category = { $in: categoryIds };
        }
      }
    }

    // Filter by Brand
    if (brand) {
      const brandsArray = brand.split(',').map((b) => b.trim());
      filter.brand = { $in: brandsArray.map((b) => new RegExp(`^${b}$`, 'i')) };
    }

    // Filter by Skin Type
    if (skinType && skinType !== 'All') {
      const skinTypes = skinType.split(',').map((s) => s.trim());
      filter.skinType = { $in: [...skinTypes, 'All'] };
    }

    // Filter by Hair Type
    if (hairType && hairType !== 'All') {
      const hairTypes = hairType.split(',').map((h) => h.trim());
      filter.hairType = { $in: [...hairTypes, 'All'] };
    }

    // Filter by Price range
    if (minPrice !== undefined || maxPrice !== undefined) {
      filter.sellingPrice = {};
      if (minPrice !== undefined) filter.sellingPrice.$gte = parseFloat(minPrice);
      if (maxPrice !== undefined) filter.sellingPrice.$lte = parseFloat(maxPrice);
    }

    // Filter by In-Stock
    if (inStock === true || inStock === 'true') {
      filter.stock = { $gt: 0 };
    }

    // Filter by Featured
    if (isFeatured === true || isFeatured === 'true') {
      filter.isFeatured = true;
    }

    // Sorting definition
    let sortCriteria = { createdAt: -1 };
    switch (sort) {
      case 'price-asc':
        sortCriteria = { sellingPrice: 1 };
        break;
      case 'price-desc':
        sortCriteria = { sellingPrice: -1 };
        break;
      case 'popular':
        sortCriteria = { averageRating: -1, reviewsCount: -1 };
        break;
      case 'discount':
        sortCriteria = { discount: -1 };
        break;
      case 'newest':
      default:
        sortCriteria = { createdAt: -1 };
        break;
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    // Notice: buyingPrice is NOT selected (it has select: false by default in Product.js)
    const [products, total] = await Promise.all([
      Product.find(filter)
        .populate('category', 'name slug')
        .sort(sortCriteria)
        .skip(skip)
        .limit(limitNum),
      Product.countDocuments(filter),
    ]);

    res.status(200).json(
      new ApiResponse(
        200,
        {
          products,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            totalPages: Math.ceil(total / limitNum),
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
 * Storefront: Get single product by Slug
 */
export const getCustomerProductBySlug = async (req, res, next) => {
  try {
    const { slug } = req.params;

    const product = await Product.findOne({ slug, isActive: true }).populate(
      'category',
      'name slug'
    );

    if (!product) {
      throw new ApiError(404, 'Product not found');
    }

    // Fetch related products in the same category
    const relatedProducts = await Product.find({
      category: product.category._id,
      _id: { $ne: product._id },
      isActive: true,
    })
      .limit(4)
      .select('-description -ingredients -variants');

    res.status(200).json(
      new ApiResponse(
        200,
        {
          product,
          relatedProducts,
        },
        'Product details retrieved'
      )
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Storefront: Get featured products (for Homepage highlights)
 */
export const getFeaturedProducts = async (req, res, next) => {
  try {
    const products = await Product.find({ isActive: true, isFeatured: true })
      .populate('category', 'name slug')
      .sort({ createdAt: -1 })
      .limit(8);

    res.status(200).json(
      new ApiResponse(200, products, 'Featured products retrieved successfully')
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Storefront: Get distinct brands and filter metadata for faceted search sidebar
 */
export const getProductFilterMeta = async (req, res, next) => {
  try {
    const [brands, categories, priceStats] = await Promise.all([
      Product.distinct('brand', { isActive: true }),
      Category.find({ isActive: true }).select('name slug _id parentCategory'),
      Product.aggregate([
        { $match: { isActive: true } },
        {
          $group: {
            _id: null,
            minPrice: { $min: '$sellingPrice' },
            maxPrice: { $max: '$sellingPrice' },
          },
        },
      ]),
    ]);

    const minPrice = priceStats.length > 0 ? priceStats[0].minPrice : 0;
    const maxPrice = priceStats.length > 0 ? priceStats[0].maxPrice : 10000;

    res.status(200).json(
      new ApiResponse(
        200,
        {
          brands: brands.filter(Boolean).sort(),
          categories,
          priceRange: { min: minPrice, max: maxPrice },
          skinTypes: ['All', 'Oily', 'Dry', 'Combination', 'Sensitive', 'Normal'],
          hairTypes: ['All', 'Straight', 'Wavy', 'Curly', 'Coily', 'Dry', 'Oily'],
        },
        'Filter options retrieved'
      )
    );
  } catch (error) {
    next(error);
  }
};
