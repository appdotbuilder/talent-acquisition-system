import { Alert, AlertDescription } from '@/components/ui/alert';
import { InfoIcon } from 'lucide-react';

interface StubNotificationProps {
  feature: string;
  className?: string;
}

export function StubNotification({ feature, className = '' }: StubNotificationProps) {
  return (
    <Alert className={`border-blue-200 bg-blue-50 ${className}`}>
      <InfoIcon className="h-4 w-4 text-blue-600" />
      <AlertDescription className="text-blue-800">
        <strong>Demo Mode:</strong> {feature} is currently using stubbed data for demonstration purposes. 
        The frontend showcases the complete user experience while backend handlers provide placeholder responses.
      </AlertDescription>
    </Alert>
  );
}