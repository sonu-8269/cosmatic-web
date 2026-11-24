import { ActivityLog } from '../../models/ActivityLog.js';
import { ApiResponse } from '../../utils/apiResponse.js';

export const getActivityLogs = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, module, role } = req.query;

    const query = {};
    if (module) query.module = module;
    if (role) query.role = role;

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const [logs, total] = await Promise.all([
      ActivityLog.find(query)
        .populate('userId', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit, 10)),
      ActivityLog.countDocuments(query),
    ]);

    res.status(200).json(
      new ApiResponse(
        200,
        {
          logs,
          pagination: {
            page: parseInt(page, 10),
            limit: parseInt(limit, 10),
            total,
            totalPages: Math.ceil(total / parseInt(limit, 10)),
          },
        },
        'Activity logs retrieved successfully'
      )
    );
  } catch (error) {
    next(error);
  }
};
