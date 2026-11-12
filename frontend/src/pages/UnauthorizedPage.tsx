import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/common/Button';

export const UnauthorizedPage: React.FC = () => {
  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center text-center px-4">
      <span className="text-6xl mb-4">⛔</span>
      <h1 className="text-3xl font-bold text-gray-900 mb-2">403 - Access Denied</h1>
      <p className="text-gray-600 max-w-md mb-6">
        You do not have administrative privileges to access this area. This action has been logged and prevented by the backend authorization policy.
      </p>
      <div className="flex space-x-4">
        <Link to="/">
          <Button variant="primary">Return to Home</Button>
        </Link>
      </div>
    </div>
  );
};

