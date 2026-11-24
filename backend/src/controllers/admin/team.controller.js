import { TeamMember } from '../../models/TeamMember.js';
import { MODULE_GROUPS, ALL_PERMISSIONS } from '../../utils/permissions.js';
import { ApiResponse } from '../../utils/apiResponse.js';
import { ApiError } from '../../utils/apiError.js';
import { recordActivity } from '../../middlewares/activityLog.middleware.js';

/**
 * Get list of available modules and permissions for UI checkboxes
 */
export const getAvailablePermissions = async (req, res) => {
  res.status(200).json(
    new ApiResponse(
      200,
      {
        moduleGroups: MODULE_GROUPS,
        allPermissions: ALL_PERMISSIONS,
      },
      'Available permissions list'
    )
  );
};

/**
 * Create a new team member with specific permissions
 */
export const createTeamMember = async (req, res, next) => {
  try {
    const { name, email, password, permissions } = req.body;

    const existing = await TeamMember.findOne({ email: email.toLowerCase() });
    if (existing) {
      throw new ApiError(400, 'A team member with this email already exists.');
    }

    const teamMember = await TeamMember.create({
      name,
      email: email.toLowerCase(),
      password,
      permissions: permissions || [],
      createdBy: req.user._id,
      isActive: true,
    });

    await recordActivity({
      req,
      module: 'team',
      action: 'create',
      description: `Created new team member: ${teamMember.name} (${teamMember.email}) with ${teamMember.permissions.length} permissions`,
      metadata: { targetId: teamMember._id, permissions: teamMember.permissions },
    });

    res.status(201).json(
      new ApiResponse(
        201,
        {
          id: teamMember._id,
          name: teamMember.name,
          email: teamMember.email,
          permissions: teamMember.permissions,
          isActive: teamMember.isActive,
          createdAt: teamMember.createdAt,
        },
        'Team member created successfully'
      )
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get all team members
 */
export const getTeamMembers = async (req, res, next) => {
  try {
    const teamMembers = await TeamMember.find()
      .select('-refreshToken')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json(
      new ApiResponse(200, teamMembers, 'Team members retrieved successfully')
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get single team member by ID
 */
export const getTeamMemberById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const teamMember = await TeamMember.findById(id).select('-refreshToken');

    if (!teamMember) {
      throw new ApiError(404, 'Team member not found.');
    }

    res.status(200).json(new ApiResponse(200, teamMember, 'Team member details retrieved'));
  } catch (error) {
    next(error);
  }
};

/**
 * Update team member (permissions, active status, name)
 */
export const updateTeamMember = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, permissions, isActive } = req.body;

    const teamMember = await TeamMember.findById(id);
    if (!teamMember) {
      throw new ApiError(404, 'Team member not found.');
    }

    if (name) teamMember.name = name;
    if (permissions !== undefined) teamMember.permissions = permissions;
    if (isActive !== undefined) teamMember.isActive = isActive;

    await teamMember.save();

    await recordActivity({
      req,
      module: 'team',
      action: 'edit',
      description: `Updated team member ${teamMember.name} (${teamMember.email})`,
      metadata: { targetId: teamMember._id, permissions: teamMember.permissions, isActive: teamMember.isActive },
    });

    res.status(200).json(
      new ApiResponse(
        200,
        {
          id: teamMember._id,
          name: teamMember.name,
          email: teamMember.email,
          permissions: teamMember.permissions,
          isActive: teamMember.isActive,
          updatedAt: teamMember.updatedAt,
        },
        'Team member updated successfully'
      )
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Delete team member
 */
export const deleteTeamMember = async (req, res, next) => {
  try {
    const { id } = req.params;
    const teamMember = await TeamMember.findByIdAndDelete(id);

    if (!teamMember) {
      throw new ApiError(404, 'Team member not found.');
    }

    await recordActivity({
      req,
      module: 'team',
      action: 'delete',
      description: `Deleted team member: ${teamMember.name} (${teamMember.email})`,
      metadata: { targetId: id },
    });

    res.status(200).json(new ApiResponse(200, null, 'Team member deleted successfully'));
  } catch (error) {
    next(error);
  }
};
