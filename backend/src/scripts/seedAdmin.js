import mongoose from 'mongoose';
import { Admin } from '../models/Admin.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

const seedAdmin = async () => {
  try {
    await mongoose.connect(env.MONGODB_URI);
    logger.info('Connected to MongoDB for Super Admin seeding.');

    const existingAdmin = await Admin.findOne({ email: env.DEFAULT_ADMIN_EMAIL.toLowerCase() });

    if (existingAdmin) {
      logger.info(`Super Admin already exists with email: ${env.DEFAULT_ADMIN_EMAIL}`);
      process.exit(0);
    }

    const admin = await Admin.create({
      name: env.DEFAULT_ADMIN_NAME,
      email: env.DEFAULT_ADMIN_EMAIL.toLowerCase(),
      password: env.DEFAULT_ADMIN_PASSWORD,
      role: 'super_admin',
      isTwoFactorEnabled: false,
    });

    logger.info('==================================================');
    logger.info('👑 Default Super Admin seeded successfully:');
    logger.info(`   Name:     ${admin.name}`);
    logger.info(`   Email:    ${admin.email}`);
    logger.info(`   Password: ${env.DEFAULT_ADMIN_PASSWORD}`);
    logger.info('==================================================');

    process.exit(0);
  } catch (error) {
    logger.error(`Error during Admin seeding: ${error.message}`);
    process.exit(1);
  }
};

seedAdmin();
