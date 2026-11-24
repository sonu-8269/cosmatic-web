import { User } from '../../models/User.js';
import { Product } from '../../models/Product.js';
import { Order } from '../../models/Order.js';
import { TeamMember } from '../../models/TeamMember.js';
import { ApiResponse } from '../../utils/apiResponse.js';

export const getDashboardStats = async (req, res, next) => {
  try {
    const [totalCustomers, totalProducts, totalOrders, totalTeamMembers] = await Promise.all([
      User.countDocuments({ role: 'customer' }),
      Product.countDocuments(),
      Order.countDocuments(),
      TeamMember.countDocuments(),
    ]);

    // Calculate total revenue from paid or delivered orders
    const revenueAggregation = await Order.aggregate([
      { $match: { paymentStatus: 'Paid' } },
      { $group: { _id: null, totalRevenue: { $sum: '$totalAmount' } } },
    ]);

    const totalRevenue = revenueAggregation.length > 0 ? revenueAggregation[0].totalRevenue : 0;

    res.status(200).json(
      new ApiResponse(
        200,
        {
          totalCustomers,
          totalProducts,
          totalOrders,
          totalTeamMembers,
          totalRevenue,
        },
        'Dashboard statistics retrieved'
      )
    );
  } catch (error) {
    next(error);
  }
};
