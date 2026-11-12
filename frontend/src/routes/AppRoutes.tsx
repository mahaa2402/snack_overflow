import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Header } from '../components/common/Header';
import { ProtectedRoute } from '../components/common/ProtectedRoute';
import { HomePage } from '../pages/HomePage';
import { SnacksPage } from '../pages/SnacksPage';
import { LoginPage } from '../pages/LoginPage';
import { SignupPage } from '../pages/SignupPage';
import { AdminDashboardPage } from '../pages/AdminDashboardPage';
import { UnauthorizedPage } from '../pages/UnauthorizedPage';
import { NotFoundPage } from '../pages/NotFoundPage';

export const AppRoutes: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50/70 text-gray-900 font-sans antialiased">
      <Header />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/snacks" element={<SnacksPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/unauthorized" element={<UnauthorizedPage />} />

          {/* Admin Protected Routes */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute requireAdmin={true}>
                <AdminDashboardPage />
              </ProtectedRoute>
            }
          />

          {/* 404 Catch-All */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
      <footer className="bg-white border-t border-gray-200/80 py-6 text-center text-xs text-gray-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <span>🍿</span>
            <span className="font-semibold text-gray-700">Snack Overflow</span>
            <span>&mdash; Office Pantry Management System</span>
          </div>
          <div>
            &copy; {new Date().getFullYear()} Snack Overflow. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};
