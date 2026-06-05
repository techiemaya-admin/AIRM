# Payslip LOP (Loss of Pay) Implementation

## Overview
This document describes the automated LOP calculation and salary deduction system integrated into the payslip generation process.

## Key Features

### 1. **Editable Base Salary**
- Each payslip now stores a `base_salary` field
- This can be edited manually or pulled from PF details
- Default: ₹15,000 if not configured

### 2. **Automatic LOP Calculation**
The system automatically calculates LOP days based on:
- **Monthly Leave Entitlement**: 1.25 days/month (15 days annually)
- **Attendance Records**: Present, Absent, Half-day, Leave, Week Off
- **Leave Balance**: Fetched from leave management system

#### LOP Calculation Logic:
```
1. Track total leave days taken in the month
2. Check employee's Privilege Leave balance
3. If leave taken > monthly entitlement (1.25 days):
   - Calculate excess = leave taken - available balance
   - Mark excess days as LOP
4. Also mark as LOP:
   - Absent days (no attendance record)
   - Half-day absences (0.5 LOP)
```

### 3. **Salary Deduction for LOP**
- **LOP Deduction Formula**: `(Base Salary + HRA) / Days in Month × LOP Days`
- Example for February (28 days):
  ```
  Base Salary: ₹40,000
  HRA: ₹16,000 (40% of base)
  Total Gross: ₹56,000
  LOP Days: 2
  
  LOP Deduction = ₹56,000 / 28 × 2 = ₹4,000
  ```

### 4. **Attendance Summary**
Each payslip includes a detailed breakdown:
- Present Days
- Half Days
- Absent Days
- Leave Days Taken
- Week Off Days
- LOP from Leave (excess leave above entitlement)
- Total LOP Days

## Database Schema

### New Fields in `erp.payslips` Table:
| Field | Type | Description |
|-------|------|-------------|
| `base_salary` | DECIMAL(10,2) | Editable base salary for the employee |
| `lop_days` | DECIMAL(5,2) | Total LOP days (absences + excess leave) |
| `lop_deduction` | DECIMAL(10,2) | Amount deducted from salary for LOP |
| `paid_days` | DECIMAL(5,2) | Number of paid working days |
| `attendance_summary` | JSONB | Detailed attendance breakdown |

## Usage

### Generating Payslips
1. Click **"Generate from Attendance"** button in Payslips section
2. Select the month and year
3. System automatically:
   - Fetches attendance data
   - Calculates LOP days
   - Applies salary deductions
   - Creates draft payslips

### Editing Payslips
- Admin can edit the `base_salary` if needed
- All calculations update automatically
- LOP deductions are stored in `other_deductions`

### Understanding the Breakdown
Example payslip output:
```json
{
  "user_id": "123",
  "month": 2,
  "year": 2026,
  "base_salary": 40000,
  "basic_pay": 38571,  // Prorated based on paid days
  "hra": 15429,
  "total_earnings": 54000,
  "lop_days": 2,
  "lop_deduction": 4000,
  "paid_days": 26,
  "total_deductions": 9800,  // PF + ESI + PT + LOP
  "net_pay": 44200,
  "attendance_summary": {
    "present": 24,
    "half_day": 0,
    "absent": 2,
    "leave": 2,
    "week_off": 8,
    "lop_from_leave": 0.75,
    "total_lop": 2
  }
}
```

## Leave Policy Integration

### 15-Day Annual Leave Policy:
- **Privilege Leave**: 15 days per year
- **Monthly Accrual**: 1.25 days per month
- **Carry Forward**: As per company policy
- **LOP Trigger**: Any leave beyond available balance

### Example Scenario:
Employee joins on Jan 1, 2026:
- **January**: 1.25 days accrued, 0 taken → Balance: 1.25
- **February**: 1.25 days accrued (total 2.5), 3 days taken
  - **Paid Leave**: 2.5 days (from balance)
  - **LOP**: 0.5 days (excess)
  - **Salary Impact**: 0.5 days deducted

## API Endpoints

### Generate Payslips
```
POST /api/payslips/generate
Body: {
  "month": 2,
  "year": 2026
}
```

### Update Payslip
```
PUT /api/payslips/:id
Body: {
  "base_salary": 45000,  // Edit base salary
  ... other fields
}
```

## Benefits

1. **Automated Compliance**: Ensures accurate leave policy enforcement
2. **Transparency**: Clear breakdown of LOP calculations
3. **Flexibility**: Editable base salary per employee
4. **Accuracy**: Automatic salary deductions based on actual attendance
5. **Audit Trail**: Complete attendance summary stored with each payslip

## Migration

Run the migration script to add new fields:
```bash
node backend/scripts/add-payslip-lop-fields.js
```

This adds all required columns to the `erp.payslips` table without affecting existing data.

## Notes

- LOP deductions are separated from statutory deductions (PF, ESI, PT)
- Week offs (Saturday & Sunday) are automatically counted as paid days
- Half-day attendance results in 0.5 LOP
- The system handles month-end differences (28-31 days) automatically
-Probation employees follow the same policy

## Future Enhancements

- Configurable leave policies per department
- Different LOP calculation methods
- Integration with payroll disbursement systems
- LOP notifications to employees
- Flexible leave carry forward rules
