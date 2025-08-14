import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/utils/trpc';
import type { User, UserRole } from '../../server/src/schema';

// Component imports
import { CandidateDashboard } from '@/components/CandidateDashboard';
import { RequesterDashboard } from '@/components/RequesterDashboard';
import { AdminDashboard } from '@/components/AdminDashboard';
import { UserSelector } from '@/components/UserSelector';
import { DataInitializer } from '@/components/DataInitializer';

function App() {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [needsInitialization, setNeedsInitialization] = useState(false);

  // Load users on mount
  const loadUsers = useCallback(async () => {
    try {
      const result = await trpc.getUsers.query();
      setUsers(result);
      // Set first user as default if available
      if (result.length > 0 && !currentUser) {
        setCurrentUser(result[0]);
        setNeedsInitialization(false);
      } else if (result.length === 0) {
        setNeedsInitialization(true);
      }
    } catch (error) {
      console.error('Failed to load users:', error);
      // If we can't load users, might need initialization
      setNeedsInitialization(true);
    }
  }, [currentUser]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleUserChange = (userId: string) => {
    const user = users.find((u: User) => u.id === parseInt(userId));
    if (user) {
      setCurrentUser(user);
    }
  };

  const getRoleColor = (role: UserRole): string => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800';
      case 'requester':
        return 'bg-blue-100 text-blue-800';
      case 'candidate':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const renderDashboard = () => {
    if (needsInitialization) {
      return (
        <DataInitializer 
          onInitialized={() => {
            setNeedsInitialization(false);
            loadUsers();
          }} 
        />
      );
    }

    if (!currentUser) {
      return (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Welcome to Talent Acquisition System</CardTitle>
            <CardDescription>Please select a user to continue</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              This system streamlines recruitment processes with AI-powered CV parsing, 
              role-based dashboards, and automated workflows.
            </p>
          </CardContent>
        </Card>
      );
    }

    switch (currentUser.role) {
      case 'candidate':
        return <CandidateDashboard candidateId={currentUser.id} user={currentUser} />;
      case 'requester':
        return <RequesterDashboard requesterId={currentUser.id} user={currentUser} />;
      case 'admin':
        return <AdminDashboard user={currentUser} />;
      default:
        return (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Unknown Role</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Unable to determine dashboard for role: {currentUser.role}</p>
            </CardContent>
          </Card>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <h1 className="text-2xl font-bold text-gray-900">🎯 TalentAI</h1>
              </div>
              <div className="ml-4 text-sm text-gray-600">
                Intelligent Talent Acquisition System
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {currentUser && (
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-700">
                    {currentUser.first_name} {currentUser.last_name}
                  </span>
                  <Badge className={getRoleColor(currentUser.role)}>
                    {currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1)}
                  </Badge>
                </div>
              )}
              
              <UserSelector
                users={users}
                currentUser={currentUser}
                onUserChange={handleUserChange}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {renderDashboard()}
      </main>
    </div>
  );
}

export default App;