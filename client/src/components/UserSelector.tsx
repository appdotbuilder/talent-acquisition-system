import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import type { User, UserRole } from '../../../server/src/schema';

interface UserSelectorProps {
  users: User[];
  currentUser: User | null;
  onUserChange: (userId: string) => void;
}

export function UserSelector({ users, currentUser, onUserChange }: UserSelectorProps) {
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

  const getRoleIcon = (role: UserRole): string => {
    switch (role) {
      case 'admin':
        return '👑';
      case 'requester':
        return '📋';
      case 'candidate':
        return '👤';
      default:
        return '🔒';
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <span className="text-sm text-gray-600">Switch User:</span>
      <Select
        value={currentUser?.id.toString() || ''}
        onValueChange={onUserChange}
      >
        <SelectTrigger className="w-64">
          <SelectValue placeholder="Select a user..." />
        </SelectTrigger>
        <SelectContent>
          {users.map((user: User) => (
            <SelectItem key={user.id} value={user.id.toString()}>
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center space-x-2">
                  <span>{getRoleIcon(user.role)}</span>
                  <span>{user.first_name} {user.last_name}</span>
                </div>
                <Badge className={`ml-2 text-xs ${getRoleColor(user.role)}`}>
                  {user.role}
                </Badge>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}