# Client Management System

## Overview

This is a full-stack web application for client management built with React, Express, and PostgreSQL. The system provides user authentication and complete CRUD operations for client data management. It features a modern UI built with shadcn/ui components and follows a clean architecture pattern with separate client and server directories.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **UI Library**: shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming
- **State Management**: TanStack Query (React Query) for server state
- **Forms**: React Hook Form with Zod validation
- **Routing**: Wouter for client-side routing
- **Build Tool**: Vite with custom configuration

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ESM modules
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Passport.js with local strategy and express-session
- **Session Store**: PostgreSQL-backed sessions via connect-pg-simple
- **Password Security**: Built-in crypto module with scrypt hashing

## Key Components

### Authentication System
- **Strategy**: Local username/password authentication
- **Session Management**: Express sessions stored in PostgreSQL
- **Password Hashing**: Scrypt-based hashing with salt
- **Protected Routes**: Client-side route protection with authentication checks

### Database Schema
- **Users Table**: Stores user credentials (username, hashed password)
- **Clients Table**: Stores client information with foreign key to users
- **Relations**: One-to-many relationship between users and clients
- **Validation**: Zod schemas for both insert and update operations

### API Structure
- **REST Endpoints**: 
  - Authentication: `/api/login`, `/api/logout`, `/api/register`, `/api/user`
  - Clients: `/api/clients` (GET with search, POST for creation)
- **Error Handling**: Standardized error responses with proper HTTP status codes
- **Request Validation**: Zod schema validation on API endpoints

## Data Flow

1. **Authentication Flow**: User credentials → Passport verification → Session creation → Protected route access
2. **Client Management**: Form submission → Zod validation → API request → Database operation → UI update via React Query
3. **Search Functionality**: Search input → Debounced API call → Database query with ILIKE → Filtered results display

## External Dependencies

### Core Framework Dependencies
- **Database**: @neondatabase/serverless (Neon PostgreSQL)
- **ORM**: drizzle-orm with drizzle-kit for migrations
- **Authentication**: passport, passport-local, express-session
- **Validation**: zod, drizzle-zod for schema generation
- **UI Components**: Complete shadcn/ui component library with Radix UI

### Development Tools
- **Build**: Vite with React plugin and TypeScript support
- **Styling**: Tailwind CSS with PostCSS
- **Code Quality**: TypeScript with strict configuration
- **Development**: tsx for running TypeScript files directly

## Deployment Strategy

### Build Process
- **Frontend**: Vite builds React app to `dist/public`
- **Backend**: esbuild bundles server code to `dist/index.js`
- **Database**: Drizzle migrations in `migrations/` directory

### Production Setup
- **Environment Variables**: DATABASE_URL, SESSION_SECRET required
- **Static Files**: Express serves built frontend from `dist/public`
- **Database**: PostgreSQL with connection pooling via Neon serverless
- **Session Storage**: PostgreSQL-backed sessions for scalability

### Development Workflow
- **Dev Server**: Vite dev server with HMR for frontend
- **API Server**: Express server with TypeScript execution via tsx
- **Database**: Push schema changes with `npm run db:push`
- **Type Safety**: Shared TypeScript schemas between client and server

The application follows a monorepo structure with shared schemas and types, ensuring type safety across the full stack while maintaining clear separation between client and server concerns.