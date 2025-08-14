import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { trpc } from '@/utils/trpc';
import type { CreateUserInput } from '../../../server/src/schema';

interface DataInitializerProps {
  onInitialized: () => void;
}

export function DataInitializer({ onInitialized }: DataInitializerProps) {
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const sampleUsers: CreateUserInput[] = [
    {
      email: 'admin@talentai.com',
      first_name: 'Sarah',
      last_name: 'Johnson',
      role: 'admin',
      department: 'Human Resources',
      phone: '+1-555-0101'
    },
    {
      email: 'john.doe@company.com',
      first_name: 'John',
      last_name: 'Doe',
      role: 'requester',
      department: 'Engineering',
      phone: '+1-555-0102'
    },
    {
      email: 'jane.smith@company.com',
      first_name: 'Jane',
      last_name: 'Smith',
      role: 'requester',
      department: 'Product',
      phone: '+1-555-0103'
    },
    {
      email: 'alex.candidate@email.com',
      first_name: 'Alex',
      last_name: 'Rodriguez',
      role: 'candidate',
      department: null,
      phone: '+1-555-0104'
    },
    {
      email: 'emily.candidate@email.com',
      first_name: 'Emily',
      last_name: 'Chen',
      role: 'candidate',
      department: null,
      phone: '+1-555-0105'
    },
    {
      email: 'mike.manager@company.com',
      first_name: 'Mike',
      last_name: 'Wilson',
      role: 'requester',
      department: 'Marketing',
      phone: '+1-555-0106'
    }
  ];

  const initializeSampleData = async () => {
    setIsInitializing(true);
    setError(null);

    try {
      // Create sample users
      for (const userData of sampleUsers) {
        await trpc.createUser.mutate(userData);
      }

      setSuccess(true);
      setTimeout(() => {
        onInitialized();
      }, 1500);
    } catch (err) {
      setError('Failed to initialize sample data. This might be normal if data already exists.');
      console.error('Initialization error:', err);
    } finally {
      setIsInitializing(false);
    }
  };

  if (success) {
    return (
      <Card className="max-w-md mx-auto mt-8">
        <CardHeader>
          <CardTitle className="text-green-600">✅ Data Initialized!</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">
            Sample users and data have been created successfully. Redirecting to the application...
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-2xl mx-auto mt-8">
      <CardHeader>
        <CardTitle>🚀 Initialize Talent Acquisition System</CardTitle>
        <CardDescription>
          Set up sample data to explore the system with different user roles and scenarios
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert className="border-yellow-200 bg-yellow-50">
            <AlertDescription className="text-yellow-800">
              {error}
            </AlertDescription>
          </Alert>
        )}

        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="font-semibold text-blue-800 mb-2">Sample Users to be Created:</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {sampleUsers.map((user, index) => (
              <div key={index} className="flex items-center space-x-2 text-sm">
                <span className={`w-3 h-3 rounded-full ${
                  user.role === 'admin' ? 'bg-red-500' :
                  user.role === 'requester' ? 'bg-blue-500' :
                  'bg-green-500'
                }`}></span>
                <span className="font-medium">{user.first_name} {user.last_name}</span>
                <span className="text-gray-500">({user.role})</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-semibold text-gray-800 mb-2">What this will demonstrate:</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• 👑 <strong>Admin Dashboard:</strong> System-wide management and job approvals</li>
            <li>• 📋 <strong>Requester Dashboard:</strong> Job posting creation and candidate pipeline</li>
            <li>• 👤 <strong>Candidate Dashboard:</strong> Application tracking and interview schedules</li>
            <li>• 🤖 <strong>AI-Powered Features:</strong> CV parsing and candidate matching (stubbed for demo)</li>
            <li>• 📊 <strong>Analytics & Reports:</strong> Weekly recruitment metrics</li>
          </ul>
        </div>

        <Button 
          onClick={initializeSampleData}
          disabled={isInitializing}
          className="w-full"
        >
          {isInitializing ? 'Initializing Sample Data...' : 'Initialize Sample Data'}
        </Button>

        <p className="text-xs text-gray-500 text-center">
          Note: Some backend handlers are stubbed for demonstration purposes. 
          The frontend showcases the complete user experience and workflow.
        </p>
      </CardContent>
    </Card>
  );
}