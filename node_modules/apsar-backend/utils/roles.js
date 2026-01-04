/**
 * Role-based access control utilities
 * 
 * Role hierarchy:
 * - admin: Full access to all features
 * - officer: View all data, create/edit most records (except system settings)
 * - member: Limited access, view assigned items, complete checklists, submit reports
 */

// Role permissions mapping
const ROLE_PERMISSIONS = {
  admin: {
    canManageUsers: true,
    canManageSystemSettings: true,
    canCreateAllRecords: true,
    canEditAllRecords: true,
    canDeleteAllRecords: true,
    canViewAllData: true,
    canApproveReports: true,
    canAssignChecklists: true,
    canSendNotifications: true,
    canManageResources: true,
  },
  officer: {
    canManageUsers: false,
    canManageSystemSettings: false,
    canCreateAllRecords: true,
    canEditAllRecords: true, // Except system settings
    canDeleteAllRecords: false,
    canViewAllData: true,
    canApproveReports: true,
    canAssignChecklists: true,
    canSendNotifications: true,
    canManageResources: false,
  },
  member: {
    canManageUsers: false,
    canManageSystemSettings: false,
    canCreateAllRecords: false, // Only specific records (callout reports, checklists)
    canEditAllRecords: false,
    canDeleteAllRecords: false,
    canViewAllData: false, // Only assigned items
    canApproveReports: false,
    canAssignChecklists: false,
    canSendNotifications: false,
    canManageResources: false,
  }
};

/**
 * Check if a role has a specific permission
 */
function hasPermission(role, permission) {
  return ROLE_PERMISSIONS[role]?.[permission] || false;
}

/**
 * Get roles that can perform admin-only actions
 */
function getAdminRoles() {
  return ['admin'];
}

/**
 * Get roles that can perform officer-level actions (admin + officer)
 */
function getOfficerRoles() {
  return ['admin', 'officer'];
}

/**
 * Get all roles
 */
function getAllRoles() {
  return ['admin', 'officer', 'member'];
}

/**
 * Check if user role allows access (for authorize middleware)
 */
function canAccess(userRole, allowedRoles) {
  return allowedRoles.includes(userRole);
}

module.exports = {
  ROLE_PERMISSIONS,
  hasPermission,
  getAdminRoles,
  getOfficerRoles,
  getAllRoles,
  canAccess,
};
