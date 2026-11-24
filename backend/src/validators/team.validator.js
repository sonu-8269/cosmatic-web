import { z } from 'zod';
import { ALL_PERMISSIONS } from '../utils/permissions.js';

export const createTeamMemberSchema = {
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Valid email address is required'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    permissions: z
      .array(z.string())
      .min(1, 'At least one permission must be assigned')
      .refine(
        (perms) => perms.every((p) => ALL_PERMISSIONS.includes(p) || p === '*' || p.endsWith('.*')),
        { message: 'One or more provided permissions are invalid.' }
      ),
  }),
};

export const updateTeamMemberPermissionsSchema = {
  body: z.object({
    permissions: z
      .array(z.string())
      .optional()
      .refine(
        (perms) =>
          !perms ||
          perms.every((p) => ALL_PERMISSIONS.includes(p) || p === '*' || p.endsWith('.*')),
        { message: 'One or more provided permissions are invalid.' }
      ),
    isActive: z.boolean().optional(),
    name: z.string().min(2).optional(),
  }),
};
