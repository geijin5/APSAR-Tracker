# RBAC Migration Guide

## Overview

This document outlines the migration from a 5-role system to a 3-role system.

## Role Mapping

- **admin** → **admin** (unchanged - full access)
- **technician, operator, trainer** → **officer** (view all, create/edit most records)
- **viewer** → **member** (limited access, view assigned items)

## Completed Changes

### Backend
- ✅ User model updated to use new roles: `['admin', 'officer', 'member']`
- ✅ Auth route validations updated
- ✅ Migration script created: `backend/scripts/migrate-roles.js`
- ✅ Role utilities created: `backend/utils/roles.js`
- ✅ Route authorizations updated:
  - ✅ callouts.js
  - ✅ calloutReports.js
  - ✅ categories.js
  - ✅ quotes.js
  - ✅ workOrders.js
  - ✅ workOrderTemplates.js
  - ✅ maintenanceTemplates.js
  - ✅ maintenance.js
  - ✅ assets.js
  - ✅ checklists.js

### Pending Changes

#### Backend
- [ ] Update seed.js to use new roles
- [ ] Update any remaining routes not yet covered
- [ ] Test all API endpoints with new roles

#### Frontend
- [ ] Update all role checks in components
- [ ] Update Dashboard.jsx role checks
- [ ] Update Users.jsx role dropdown
- [ ] Update Layout.jsx role-based navigation
- [ ] Update Certificates.jsx role checks
- [ ] Update all pages that check for specific roles

## Running the Migration

1. **Backup your database first!**

2. Run the migration script:
   ```bash
   cd backend
   node scripts/migrate-roles.js
   ```

3. Verify the migration:
   - Check that all users have valid roles (admin, officer, or member)
   - Test login with migrated users
   - Test API endpoints with different roles

## Permission Matrix

| Feature | Admin | Officer | Member |
|---------|-------|---------|--------|
| Manage Users | ✅ | ❌ | ❌ |
| System Settings | ✅ | ❌ | ❌ |
| Create All Records | ✅ | ✅ | ❌ |
| Edit All Records | ✅ | ✅ | ❌ |
| Delete All Records | ✅ | ❌ | ❌ |
| View All Data | ✅ | ✅ | ❌ |
| Approve Reports | ✅ | ✅ | ❌ |
| Assign Checklists | ✅ | ✅ | ❌ |
| Send Notifications | ✅ | ✅ | ❌ |
| Manage Resources | ✅ | ❌ | ❌ |
| View Assigned Items | ✅ | ✅ | ✅ |
| Complete Checklists | ✅ | ✅ | ✅ |
| Submit Callout Reports | ✅ | ✅ | ✅ |
| Use Chat | ✅ | ✅ | ✅ |

## Notes

- The migration script maps existing users to new roles automatically
- All routes have been updated to use the new role system
- Frontend components still need to be updated to use the new roles
- Test thoroughly before deploying to production

