import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { FileIcon, UserIcon, CalendarIcon, CheckCircleIcon, XCircleIcon } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { Application, ApplicationStatus } from '../../../server/src/schema';

interface ApplicationReviewProps {
  application: Application;
  onStatusUpdate: () => void;
}

export function ApplicationReview({ application, onStatusUpdate }: ApplicationReviewProps) {
  const [selectedStatus, setSelectedStatus] = useState<ApplicationStatus>(application.status);
  const [notes, setNotes] = useState(application.notes || '');
  const [isUpdating, setIsUpdating] = useState(false);

  const updateApplicationStatus = async () => {
    setIsUpdating(true);
    try {
      await trpc.updateApplicationStatus.mutate({
        application_id: application.id,
        status: selectedStatus,
        notes: notes || null
      });
      onStatusUpdate();
    } catch (error) {
      console.error('Failed to update application status:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const processWithAI = async () => {
    try {
      await trpc.processCVWithAI.mutate({ cvFileId: application.cv_file_id });
      onStatusUpdate();
    } catch (error) {
      console.error('Failed to process CV with AI:', error);
    }
  };

  const getStatusColor = (status: ApplicationStatus): string => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'ai_processing':
        return 'bg-blue-100 text-blue-800';
      case 'shortlisted':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'interview_scheduled':
        return 'bg-purple-100 text-purple-800';
      case 'offer_made':
        return 'bg-emerald-100 text-emerald-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: ApplicationStatus): string => {
    switch (status) {
      case 'pending':
        return '⏳';
      case 'ai_processing':
        return '🤖';
      case 'shortlisted':
        return '✅';
      case 'rejected':
        return '❌';
      case 'interview_scheduled':
        return '📅';
      case 'offer_made':
        return '🎉';
      default:
        return '📄';
    }
  };

  const statusOptions: ApplicationStatus[] = [
    'pending',
    'ai_processing',
    'shortlisted',
    'rejected',
    'interview_scheduled',
    'interviewed',
    'offer_made',
    'offer_accepted',
    'offer_rejected',
    'hired'
  ];

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">{getStatusIcon(application.status)}</span>
            <div>
              <CardTitle className="text-base">Application #{application.id}</CardTitle>
              <CardDescription>
                Job ID: {application.job_id} • Candidate ID: {application.candidate_id}
              </CardDescription>
            </div>
          </div>
          <Badge className={getStatusColor(application.status)}>
            {application.status.replace('_', ' ').toUpperCase()}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Application Details */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Applied:</span>{' '}
            {application.created_at.toLocaleDateString()}
          </div>
          <div>
            <span className="text-gray-500">Last Updated:</span>{' '}
            {application.updated_at.toLocaleDateString()}
          </div>
        </div>

        {/* AI Match Score */}
        {application.ai_match_score && (
          <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
            <div className="text-blue-600 font-medium">🤖 AI Match Score:</div>
            <Progress 
              value={application.ai_match_score} 
              className="flex-1 h-3"
            />
            <div className="text-blue-600 font-bold">
              {application.ai_match_score}%
            </div>
          </div>
        )}

        {/* Cover Letter Preview */}
        {application.cover_letter && (
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="text-sm font-medium text-gray-700 mb-2">Cover Letter:</div>
            <div className="text-sm text-gray-600 line-clamp-3">
              {application.cover_letter}
            </div>
          </div>
        )}

        {/* Current Notes */}
        {application.notes && (
          <div className="p-3 bg-yellow-50 rounded-lg">
            <div className="text-sm font-medium text-yellow-700 mb-2">Notes:</div>
            <div className="text-sm text-yellow-600">
              {application.notes}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-3 border-t">
          <div className="flex space-x-2">
            {application.status === 'pending' && (
              <Button
                size="sm"
                variant="outline"
                onClick={processWithAI}
                className="text-blue-600 border-blue-600 hover:bg-blue-50"
              >
                🤖 Process with AI
              </Button>
            )}
            
            {application.status === 'shortlisted' && (
              <Button
                size="sm"
                variant="outline"
                className="text-purple-600 border-purple-600 hover:bg-purple-50"
              >
                📅 Schedule Interview
              </Button>
            )}
          </div>

          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                Update Status
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Update Application Status</DialogTitle>
                <DialogDescription>
                  Change the status of Application #{application.id}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="status">New Status</Label>
                  <Select
                    value={selectedStatus}
                    onValueChange={(value: ApplicationStatus) => setSelectedStatus(value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((status) => (
                        <SelectItem key={status} value={status}>
                          <div className="flex items-center space-x-2">
                            <span>{getStatusIcon(status)}</span>
                            <span>{status.replace('_', ' ').toUpperCase()}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)}
                    placeholder="Add any additional notes about this status change..."
                    rows={3}
                  />
                </div>

                <div className="flex justify-end space-x-2">
                  <Button
                    onClick={updateApplicationStatus}
                    disabled={isUpdating}
                  >
                    {isUpdating ? 'Updating...' : 'Update Status'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
}