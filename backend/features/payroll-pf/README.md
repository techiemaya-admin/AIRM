# Payroll & PF Feature

## LAD Architecture Compliance

✅ **All files under 400 lines**
✅ **Feature isolation maintained**
✅ **Proper layering (routes → controllers → services → models)**
✅ **No cross-feature imports**

## File Structure

### Models (PostgreSQL queries only)
- `models/payslips.pg.js` (215 lines) - Payslip queries
- `models/pf-details.pg.js` (73 lines) - PF details queries
- `models/pf-contributions.pg.js` (95 lines) - PF contribution queries
- `models/pf-documents.pg.js` (59 lines) - PF document queries
- `models/payroll-audit-log.pg.js` (76 lines) - Audit log queries
- `models/index.js` (9 lines) - Barrel export

### Services (Business logic)
- `services/payroll-pf.service.js` (367 lines) - All business logic

### Controllers (Request/response)
- `controllers/payslips.controller.js` (153 lines) - Payslip endpoints
- `controllers/pf-management.controller.js` (215 lines) - PF management endpoints

### Routes (API endpoints)
- `routes/payroll-pf.routes.js` (89 lines) - Route definitions

### Configuration
- `manifest.js` (38 lines) - Feature metadata

## API Endpoints

### Payslips
- `GET /api/payroll-pf/payslips` - Get payslips
- `GET /api/payroll-pf/payslips/:id` - Get payslip by ID
- `POST /api/payroll-pf/payslips` - Create payslip
- `PUT /api/payroll-pf/payslips/:id` - Update payslip
- `PUT /api/payroll-pf/payslips/:id/release` - Release payslip
- `PUT /api/payroll-pf/payslips/:id/lock` - Lock payslip

### PF Management
- `GET /api/payroll-pf/pf-details` - Get own PF details
- `GET /api/payroll-pf/pf-details/:userId` - Get PF details for user
- `POST /api/payroll-pf/pf-details` - Create PF details
- `PUT /api/payroll-pf/pf-details/:userId` - Update PF details
- `GET /api/payroll-pf/pf-contributions` - Get PF contributions
- `POST /api/payroll-pf/pf-contributions` - Create PF contribution
- `GET /api/payroll-pf/pf-documents` - Get PF documents
- `POST /api/payroll-pf/pf-documents` - Add PF document
- `GET /api/payroll-pf/audit-log` - Get audit log

## Access Control

- **Employees**: View own payslips and PF details only
- **HR/Admin**: Full access to all payroll and PF operations

## Database Tables

- `erp.payslips` - Employee payslips
- `erp.pf_details` - PF details per employee
- `erp.pf_contributions` - Monthly PF contribution history
- `erp.pf_documents` - PF-related documents
- `erp.payroll_audit_log` - Audit trail

## Migration

Run: `database/002_payroll_pf_tables.sql`

