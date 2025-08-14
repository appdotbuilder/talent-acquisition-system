import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { trpc } from '@/utils/trpc';
import type { CreateJobInput } from '../../../server/src/schema';

interface CreateJobFormProps {
  createdBy: number;
  onSuccess: () => void;
}

export function CreateJobForm({ createdBy, onSuccess }: CreateJobFormProps) {
  const [formData, setFormData] = useState<CreateJobInput>({
    title: '',
    description: '',
    requirements: '',
    department: '',
    location: null,
    salary_range: null,
    employment_type: 'Full-time',
    created_by: createdBy
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await trpc.createJob.mutate(formData);
      onSuccess();
      // Reset form
      setFormData({
        title: '',
        description: '',
        requirements: '',
        department: '',
        location: null,
        salary_range: null,
        employment_type: 'Full-time',
        created_by: createdBy
      });
    } catch (error) {
      console.error('Failed to create job:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const departments = [
    'Engineering',
    'Product',
    'Design',
    'Marketing',
    'Sales',
    'Human Resources',
    'Finance',
    'Operations',
    'Customer Success',
    'Legal'
  ];

  const employmentTypes = [
    'Full-time',
    'Part-time',
    'Contract',
    'Internship',
    'Freelance'
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="title">Job Title *</Label>
          <Input
            id="title"
            value={formData.title}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setFormData((prev: CreateJobInput) => ({ ...prev, title: e.target.value }))
            }
            placeholder="e.g. Senior Software Engineer"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="department">Department *</Label>
          <Select
            value={formData.department}
            onValueChange={(value: string) =>
              setFormData((prev: CreateJobInput) => ({ ...prev, department: value }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select department" />
            </SelectTrigger>
            <SelectContent>
              {departments.map((dept) => (
                <SelectItem key={dept} value={dept}>
                  {dept}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="employment_type">Employment Type</Label>
          <Select
            value={formData.employment_type}
            onValueChange={(value: string) =>
              setFormData((prev: CreateJobInput) => ({ ...prev, employment_type: value }))
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {employmentTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="location">Location</Label>
          <Input
            id="location"
            value={formData.location || ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setFormData((prev: CreateJobInput) => ({
                ...prev,
                location: e.target.value || null
              }))
            }
            placeholder="e.g. San Francisco, CA / Remote"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="salary_range">Salary Range</Label>
        <Input
          id="salary_range"
          value={formData.salary_range || ''}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setFormData((prev: CreateJobInput) => ({
              ...prev,
              salary_range: e.target.value || null
            }))
          }
          placeholder="e.g. $80,000 - $120,000"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Job Description *</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
            setFormData((prev: CreateJobInput) => ({ ...prev, description: e.target.value }))
          }
          placeholder="Describe the role, responsibilities, and what the candidate will be doing..."
          rows={4}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="requirements">Requirements *</Label>
        <Textarea
          id="requirements"
          value={formData.requirements}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
            setFormData((prev: CreateJobInput) => ({ ...prev, requirements: e.target.value }))
          }
          placeholder="List the required skills, experience, education, and qualifications..."
          rows={4}
          required
        />
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Creating...' : 'Create Job Posting'}
        </Button>
      </div>
    </form>
  );
}