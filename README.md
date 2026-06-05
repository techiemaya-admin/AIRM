# TechieMaya Timesheet Management System

A comprehensive timesheet and employee management system built with React (TypeScript frontend) and Express.js (Node.js backend), following a feature-based modular architecture.

## Architecture

This codebase follows the **LAD (Layered Architecture Design)** pattern with a feature-based modular structure:

- **Feature Isolation**: Each feature is self-contained
- **Clear Separation of Concerns**: Core, Features, and Shared modules
- **Scalability**: Easy to add new features without affecting existing ones
- **Maintainability**: Clear structure makes code easier to understand and modify

## Project Structure

```
AIRM/
├── backend/                    # Node.js/Express Backend
│   ├── core/                   # Core system modules
│   │   ├── auth/               # Authentication & authorization
│   │   ├── users/              # User management
│   │   ├── middleware/         # Core middleware (auth, error handling, rate limiting)
│   │   └── billing/            # Billing functionality
│   ├── features/               # Feature modules (isolated)
│   │   ├── profiles/           # Employee profile management
│   │   ├── exit-formalities/   # Employee exit management
│   │   ├── payroll-pf/         # Payroll & Provident Fund
│   │   ├── timesheet/          # Time tracking and timesheets
│   │   ├── time-clock/         # Clock in/out operations
│   │   ├── projects/           # Project management
│   │   ├── issues/             # Issue tracking
│   │   ├── leave-calendar/     # Leave requests
│   │   ├── payslips/           # Payslip viewing
│   │   ├── monitoring/         # System monitoring
│   │   ├── resource-management/# Resource management
│   │   └── git/                # Git integration
│   ├── shared/                 # Shared utilities
│   │   ├── database/           # Database connection & pooling
│   │   ├── middleware/         # Shared middleware
│   │   └── services/           # Shared services (email, etc.)
│   ├── migrations/             # Database migrations (SQL)
│   ├── src/                    # Legacy routes (temporary)
│   └── server.js               # Express server entry point
│
├── frontend/                   # React/TypeScript Frontend
│   ├── features/               # Feature-based organization
│   │   ├── profiles/           # Profile services, hooks, components
│   │   ├── exit-formalities/   # Exit services, hooks, components
│   │   ├── payroll-pf/         # Payroll services, hooks
│   │   ├── timesheet/          # Timesheet services, hooks, pages
│   │   └── [other features]/   # Other feature modules
│   ├── src/
│   │   ├── components/         # Reusable UI components
│   │   │   ├── ui/             # Base UI components (Radix UI)
│   │   │   ├── AuthGuard.tsx
│   │   │   ├── Layout.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── Notifications.tsx
│   │   ├── pages/              # Application pages/routes
│   │   ├── lib/                # Utilities (api client, logger, utils)
│   │   ├── hooks/              # Custom React hooks
│   │   ├── sdk/                # SDK exports
│   │   ├── App.tsx
│   │   └── main.tsx
│   └── public/                 # Static assets
│
├── database/                   # Database migrations (reference)
└── configs/                    # Configuration files (if exists)
```

### Feature Structure

Each feature follows this consistent structure:

**Backend:**
```
feature-name/
├── routes/              # API route definitions
│   └── feature-name.routes.js
├── controllers/         # Request/response handling
│   └── feature-name.controller.js
├── services/           # Business logic
│   └── feature-name.service.js
├── models/             # Database queries (PostgreSQL)
│   └── feature-name.pg.js
└── manifest.js         # Feature metadata & dependencies
```

**Frontend:**
```
feature-name/
├── services/           # API service functions
├── hooks/              # React Query hooks
├── components/         # Feature-specific components
├── page.tsx            # Main feature page
├── types.ts            # TypeScript type definitions
└── index.ts            # Barrel exportscd AIRM/backend
npm install pdf-parse mammoth xlsx tesseract.js pdfkit docx handlebars multer cheerio

cd ../frontend
npm install react-dropzone
```

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- PostgreSQL database (v12 or higher)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd AIRM
   ```

2. **Install frontend dependencies**
   ```bash
   cd frontend
   npm install
   ```

3. **Install backend dependencies**
   ```bash
   cd ../backend
   npm install
   ```

4. **Set up environment variables**

   Create or update `configs/.env` (or `backend/.env` as fallback):
   ```env
   PORT=3001
   NODE_ENV=development
   
   # Database Configuration (use either DB_* or POSTGRES_* format)
   DB_HOST=your_postgres_host
   DB_PORT=5432
   DB_NAME=your_database_name
   DB_USER=your_postgres_user
   DB_PASSWORD=your_postgres_password
   
   # Or use POSTGRES_* format:
   # POSTGRES_HOST=your_postgres_host
   # POSTGRES_PORT=5432
   # POSTGRES_DB=your_database_name
   # POSTGRES_USER=your_postgres_user
   # POSTGRES_PASSWORD=your_postgres_password
   
   # JWT Configuration
   JWT_SECRET=your_jwt_secret_min_32_characters
   
   # CORS Configuration
   CORS_ORIGIN=http://localhost:5173,http://localhost:5174
   ```

5. **Set up the database**

   Run the SQL migration scripts from `backend/migrations/` in your PostgreSQL database. These will create all necessary tables, functions, and triggers in the `erp` schema.

   Main migrations:
   - `migrate-to-postgresql.sql` - Core schema
   - `001_exit_formalities_tables.sql` - Exit management
   - `002_payroll_pf_tables.sql` - Payroll & PF
   - `003_exit_management_extended.sql` - Extended exit features
   - Other feature-specific migrations

### Running the Application

#### Quick Start (PowerShell Script)

If you have a `start-dev.ps1` script:
```powershell
cd AIRM
.\start-dev.ps1
```

This will start both servers automatically.

#### Manual Start

**Terminal 1 - Backend:**
```powershell
cd backend
npm run dev
```
The API will be available at `http://localhost:3001`

**Terminal 2 - Frontend:**
```powershell
cd frontend
npm run dev
```
The application will be available at `http://localhost:5173`

#### One-Line Commands

**Backend:**
```powershell
cd backend; npm run dev
```

**Frontend:**
```powershell
cd frontend; npm run dev
```

### Building for Production

1. **Build the frontend:**
   ```bash
   cd frontend
   npm run build
   ```

2. **Start the backend in production mode:**
   ```bash
   cd backend
   npm start
   ```

## Features

- **Employee Profile Management** - Kanban, List, and Grid views
- **Timesheet Management** - Weekly timesheet tracking with detailed entries
- **Time Clock** - Simple clock-in/clock-out interface with location tracking
- **Project Management** - Track and manage projects
- **Issue Tracking** - GitHub issue integration and management
- **Leave Calendar** - Request and manage time off
- **Exit Formalities** - Complete employee exit management workflow
- **Payroll & PF** - Payslip management and Provident Fund tracking
- **Git Integration** - GitLab/GitHub integration
- **User Management** - Admin panel for managing users and roles
- **Monitoring** - System-wide statistics and activity monitoring
- **Notifications** - Real-time notifications for important events
- **Burnout Risk Tracking** - Monitor employee workload

## API Routes

All routes follow the pattern: `/api/{feature-name}/{endpoint}`

### Core Routes
- `/api/auth/*` - Authentication (magic link, JWT)
- `/api/users/*` - User management

### Feature Routes
- `/api/profiles/*` - Profile management
- `/api/timesheets/*` - Time tracking (also `/api/timesheet` for backward compatibility)
- `/api/time-clock/*` - Clock in/out operations
- `/api/projects/*` - Project management
- `/api/issues/*` - Issue tracking
- `/api/exit-formalities/*` - Exit management
- `/api/payroll-pf/*` - Payroll & PF
- `/api/payslips/*` - Payslip viewing
- `/api/leave-calendar/*` - Leave requests
- `/api/git/*` - Git integration
- `/api/monitoring/*` - System monitoring

## Database

The application uses PostgreSQL with all tables in the `erp` schema. Database migrations are located in `backend/migrations/`.

### Common Database Setup Issues

**Connection Timeout:**
- Verify database credentials in `configs/.env` or `backend/.env`
- Check if database server is accessible (network, VPN, firewall)
- Ensure database server is running

**Wrong Credentials:**
- Double-check username, password, host, and database name
- Verify the database exists and user has proper permissions

**Default Connection Values:**
If `.env` is not configured, the system will use defaults (which may not work for your setup):
- Host: `143.110.249.144`
- Port: `5432`
- Database: `salesmaya_agent`
- User: `postgres`

**You must configure your `.env` file with actual database credentials.**

## Troubleshooting

### Port Already in Use (EADDRINUSE)

If port 3001 is already occupied:

**Windows PowerShell:**
```powershell
# Find and kill process using port 3001
Get-Process -Id (Get-NetTCPConnection -LocalPort 3001).OwningProcess | Stop-Process -Force

# Or change port in .env
# PORT=3002
```

### Database Connection Issues

1. **Check `.env` file exists and has correct values:**
   ```powershell
   cd configs  # or backend
   notepad .env
   ```

2. **Test database connection:**
   ```powershell
   # If you have psql installed
   psql -h <your_host> -U <your_user> -d <your_database>
   ```

3. **Verify environment variables are loading:**
   - Check that `.env` is in `configs/` or `backend/` directory
   - Ensure variable names match (DB_* or POSTGRES_*)

### Module Not Found Errors

- Run `npm install` in both `frontend/` and `backend/` directories
- Check that import paths are correct (they should use relative paths)
- Clear `node_modules` and reinstall if needed

### Environment Variables Not Loading

The server looks for `.env` in this order:
1. `configs/.env`
2. `backend/.env` (fallback)

Make sure your `.env` file is in one of these locations.

## Development

### Making a User Admin

```bash
cd backend
node make-admin.js <email>
```

### Architecture Guidelines

1. **Feature Isolation**: Features should not import from other features
2. **Dependency Declaration**: All dependencies must be declared in `manifest.js`
3. **File Size**: Keep files under 400 lines
4. **Layering**: Follow strict layering (routes → controllers → services → models)
5. **Naming**: Use kebab-case for feature names and routes
6. **Testing**: Each feature should be testable in isolation

## Tech Stack

### Frontend
- React 18 with TypeScript
- Vite - Build tool and dev server
- React Router - Client-side routing
- TanStack Query - Data fetching and caching
- Tailwind CSS - Utility-first CSS
- Radix UI - Accessible UI components
- Lucide React - Icons
- jsPDF - PDF generation

### Backend
- Node.js with Express.js
- PostgreSQL - Database
- JWT - Authentication tokens
- bcrypt - Password hashing
- nodemailer/resend - Email services

## License

ISC

## Contact

For issues, questions, or contributions, please contact the development team.
