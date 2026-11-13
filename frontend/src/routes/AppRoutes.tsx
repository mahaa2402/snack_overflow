import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Header } from '../components/common/Header';
import { ProtectedRoute } from '../components/common/ProtectedRoute';
import { AdminLayout } from '../components/common/AdminLayout';
import { useTheme } from '../context/ThemeContext';
import { HomePage } from '../pages/HomePage';
import { SnacksPage } from '../pages/SnacksPage';
import { MyPantryPage } from '../pages/MyPantryPage';
import { LoginPage } from '../pages/LoginPage';
import { SignupPage } from '../pages/SignupPage';
import { AdminDashboardPage } from '../pages/AdminDashboardPage';
import { AdminInventoryPage } from '../pages/AdminInventoryPage';
import { AdminInsightsPage } from '../pages/AdminInsightsPage';
import { AdminActivityPage } from '../pages/AdminActivityPage';
import { AdminRestockPage } from '../pages/AdminRestockPage';
import { UnauthorizedPage } from '../pages/UnauthorizedPage';
import { NotFoundPage } from '../pages/NotFoundPage';

const PublicLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isDark } = useTheme();

  return (
    <div
      className={`min-h-screen flex flex-col font-sans antialiased transition-colors duration-300 ${
        isDark
          ? 'bg-[#0b0f17] text-slate-100 selection:bg-orange-500 selection:text-white'
          : 'bg-[#faf7f2] text-gray-900 selection:bg-orange-500 selection:text-white'
      }`}
    >
      <Header />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
      <footer
        className={`border-t py-6 text-center text-xs transition-colors duration-300 ${
          isDark
            ? 'bg-[#080c14] border-slate-800/80 text-slate-400'
            : 'bg-white border-gray-200/80 text-gray-500'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <span>🍿</span>
            <span className={`font-semibold ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>
              Snack Overflow
            </span>
            <span>&mdash; Office Pantry Management System</span>
          </div>
          <div className={isDark ? 'text-slate-400' : 'text-gray-500'}>
            &copy; {new Date().getFullYear()} Snack Overflow. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<PublicLayout><HomePage /></PublicLayout>} />
      <Route path="/snacks" element={<PublicLayout><SnacksPage /></PublicLayout>} />
      <Route
        path="/my-pantry"
        element={
          <ProtectedRoute>
            <PublicLayout>
              <MyPantryPage />
            </PublicLayout>
          </ProtectedRoute>
        }
      />
      <Route path="/login" element={<PublicLayout><LoginPage /></PublicLayout>} />
      <Route path="/signup" element={<PublicLayout><SignupPage /></PublicLayout>} />
      <Route path="/unauthorized" element={<PublicLayout><UnauthorizedPage /></PublicLayout>} />

      {/* Admin Routes - Sidebar Layout */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute requireAdmin={true}>
            <AdminLayout>
              <AdminDashboardPage />
            </AdminLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/inventory"
        element={
          <ProtectedRoute requireAdmin={true}>
            <AdminLayout>
              <AdminInventoryPage />
            </AdminLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/insights"
        element={
          <ProtectedRoute requireAdmin={true}>
            <AdminLayout>
              <AdminInsightsPage />
            </AdminLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/activity"
        element={
          <ProtectedRoute requireAdmin={true}>
            <AdminLayout>
              <AdminActivityPage />
            </AdminLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/restock"
        element={
          <ProtectedRoute requireAdmin={true}>
            <AdminLayout>
              <AdminRestockPage />
            </AdminLayout>
          </ProtectedRoute>
        }
      />

      {/* 404 Catch-All */}
      <Route path="*" element={<PublicLayout><NotFoundPage /></PublicLayout>} />
    </Routes>
  );
};
