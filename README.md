# AIRM Project

This repository contains the complete source code for the AIRM (Automated Integrated Resource Management) system.

## Project Structure

- **backend/**: Node.js/Express backend, database models, migrations, and API routes.
- **frontend/**: React/TypeScript frontend, UI components, features, and SDK integration.
- **prisma/**: Prisma schema for database modeling.
- **public/**: Static assets and uploads.

## Key Features
- Employee onboarding and profile management
- Leave calendar and timesheet tracking
- Payroll and HR document automation
- Project and resource management
- Git integration and issue tracking
- Authentication and user roles

## Getting Started

### Backend
1. Install dependencies:
   ```sh
   cd backend
   npm install
   ```
2. Start the server:
   ```sh
   npm start
   # or
   npm run dev
   ```
3. Configure your database in `backend/database/db.ts` and run migrations as needed.

### Frontend
1. Install dependencies:
   ```sh
   cd frontend
   npm install
   ```
2. Start the development server:
   ```sh
   npm run dev
   ```

### Database
- See `prisma/schema.prisma` for the database schema.
- Use provided SQL migration files in `backend/migrations/` for setup.

## Contributing
Pull requests and issues are welcome! Please follow the code style and add documentation/comments where needed.

## License
This project is licensed under the MIT License.