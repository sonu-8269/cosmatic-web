/**
 * Permission Definition Matrix for RBAC
 */
export const PERMISSIONS = {
  // Products
  PRODUCTS_VIEW: 'products.view',
  PRODUCTS_CREATE: 'products.create',
  PRODUCTS_EDIT: 'products.edit',
  PRODUCTS_DELETE: 'products.delete',

  // Categories
  CATEGORIES_VIEW: 'categories.view',
  CATEGORIES_CREATE: 'categories.create',
  CATEGORIES_EDIT: 'categories.edit',
  CATEGORIES_DELETE: 'categories.delete',

  // Orders
  ORDERS_VIEW: 'orders.view',
  ORDERS_UPDATE_STATUS: 'orders.update_status',
  ORDERS_CANCEL: 'orders.cancel',
  ORDERS_REFUND: 'orders.refund',

  // Coupons
  COUPONS_VIEW: 'coupons.view',
  COUPONS_CREATE: 'coupons.create',
  COUPONS_EDIT: 'coupons.edit',
  COUPONS_DELETE: 'coupons.delete',

  // Banners & Content
  BANNERS_VIEW: 'banners.view',
  BANNERS_CREATE: 'banners.create',
  BANNERS_EDIT: 'banners.edit',
  BANNERS_DELETE: 'banners.delete',

  // Customers
  CUSTOMERS_VIEW: 'customers.view',
  CUSTOMERS_BLOCK: 'customers.block',

  // Reports & Analytics
  REPORTS_VIEW: 'reports.view',
};

export const ALL_PERMISSIONS = Object.values(PERMISSIONS);

export const MODULE_GROUPS = [
  {
    module: 'products',
    label: 'Products Management',
    actions: ['view', 'create', 'edit', 'delete'],
  },
  {
    module: 'categories',
    label: 'Categories Management',
    actions: ['view', 'create', 'edit', 'delete'],
  },
  {
    module: 'orders',
    label: 'Orders & Fulfillment',
    actions: ['view', 'update_status', 'cancel', 'refund'],
  },
  {
    module: 'coupons',
    label: 'Coupons & Discounts',
    actions: ['view', 'create', 'edit', 'delete'],
  },
  {
    module: 'banners',
    label: 'Banners & Hero Media',
    actions: ['view', 'create', 'edit', 'delete'],
  },
  {
    module: 'customers',
    label: 'Customer Relations',
    actions: ['view', 'block'],
  },
  {
    module: 'reports',
    label: 'Sales & Analytics Reports',
    actions: ['view'],
  },
];

/**
 * Check if a list of permissions granted to a user covers the required action
 */
export const hasPermission = (userPermissions = [], requiredPermission) => {
  if (!userPermissions || !Array.isArray(userPermissions)) return false;
  if (userPermissions.includes('*')) return true;
  if (userPermissions.includes(requiredPermission)) return true;

  const [module] = requiredPermission.split('.');
  if (userPermissions.includes(`${module}.*`)) return true;

  return false;
};
