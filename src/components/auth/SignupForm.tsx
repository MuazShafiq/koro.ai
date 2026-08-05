'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useSupabase } from '../../utils/supabase/provider';
import { toast } from 'sonner';
import { Eye, EyeOff, Mail, Lock, User, MapPin, GraduationCap, BookOpen, Target } from 'lucide-react';

const SUBJECTS = [
  'Mathematics', 'Science', 'Computer Science', 'Physics', 'Chemistry', 
  'Biology', 'English', 'History', 'Geography', 'Art', 'Music', 'Languages'
];

const GRADE_LEVELS = [
  'Elementary (K-5)', 'Middle School (6-8)', 'High School (9-12)', 
  'College/University', 'Graduate School', 'Professional Development'
];

export default function SignupForm() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    age: '',
    location: '',
    school: '',
    gradeLevel: '',
    subjectsOfInterest: [] as string[],
    learningGoals: '',
    bio: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const { supabase } = useSupabase();
  const router = useRouter();

  const handleInputChange = (field: string, value: string | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubjectToggle = (subject: string) => {
    setFormData(prev => ({
      ...prev,
      subjectsOfInterest: prev.subjectsOfInterest.includes(subject)
        ? prev.subjectsOfInterest.filter(s => s !== subject)
        : [...prev.subjectsOfInterest, subject]
    }));
  };

  const validateStep1 = () => {
    if (!formData.email || !formData.password || !formData.confirmPassword || !formData.fullName) {
      toast.error('Please fill in all required fields');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return false;
    }
    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return false;
    }
    return true;
  };

  const handleNextStep = () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
    } else if (step === 2) {
      setStep(3);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step < 3) {
      handleNextStep();
      return;
    }
    if (!validateStep1()) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
            age: formData.age ? parseInt(formData.age) : null,
            location: formData.location,
            school: formData.school,
            grade_level: formData.gradeLevel,
            subjects_of_interest: formData.subjectsOfInterest,
            learning_goals: formData.learningGoals,
            bio: formData.bio
          }
        }
      });

      if (error) {
        toast.error(error.message);
      } else {
        toast.success('Account created successfully! Please check your email to verify your account.');
        router.push('/login');
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const inputClassName = 'h-10 border-gray-600 bg-gray-800 text-white placeholder:text-gray-400 focus:border-purple-400 sm:h-12';
  const fieldClassName = 'space-y-1.5 sm:space-y-2';
  const labelClassName = 'flex items-center gap-2 text-xs font-medium text-gray-200 sm:text-sm';
  const navButtonClassName = 'h-10 flex-1 sm:h-12';

  const stepTitle = step === 1
    ? 'Create your account'
    : step === 2
      ? 'A little about you'
      : 'Shape your learning';
  const stepDescription = step === 1
    ? 'Your sign-in details'
    : step === 2
      ? 'Optional profile details'
      : 'Choose what Koro should focus on';

  return (
    <Card className="surface-panel w-full rounded-[1.25rem] border-white/[0.08] shadow-2xl sm:rounded-[1.5rem]">
      <CardHeader className="space-y-1 pb-3 pt-4 text-center sm:p-6 sm:pb-4">
        <CardTitle className="text-xl font-bold text-gray-100 sm:text-2xl">
          {stepTitle}
        </CardTitle>
        <CardDescription className="text-xs text-gray-300 sm:text-sm">
          {stepDescription}
        </CardDescription>
        <div
          className="flex justify-center pt-2 sm:pt-3"
          role="progressbar"
          aria-label="Signup progress"
          aria-valuemin={1}
          aria-valuemax={3}
          aria-valuenow={step}
        >
          <div className="flex space-x-2">
            {[1, 2, 3].map((indicator) => (
              <div
                key={indicator}
                className={`h-2.5 w-2.5 rounded-full transition-colors sm:h-3 sm:w-3 ${
                  step >= indicator ? 'bg-purple-500' : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-4 pb-4 sm:px-6 sm:pb-6">
        <form onSubmit={handleSubmit}>
          {step === 1 && (
            <div className="space-y-3 sm:space-y-4">
              <div className={fieldClassName}>
                <Label htmlFor="fullName" className={labelClassName}>
                  <User className="h-4 w-4" />
                  Full name *
                </Label>
                <Input
                  id="fullName"
                  type="text"
                  value={formData.fullName}
                  onChange={(event) => handleInputChange('fullName', event.target.value)}
                  className={inputClassName}
                  placeholder="Enter your full name"
                  required
                />
              </div>

              <div className={fieldClassName}>
                <Label htmlFor="signupEmail" className={labelClassName}>
                  <Mail className="h-4 w-4" />
                  Email *
                </Label>
                <Input
                  id="signupEmail"
                  type="email"
                  value={formData.email}
                  onChange={(event) => handleInputChange('email', event.target.value)}
                  className={inputClassName}
                  placeholder="Enter your email"
                  required
                />
              </div>

              <div className={fieldClassName}>
                <Label htmlFor="signupPassword" className={labelClassName}>
                  <Lock className="h-4 w-4" />
                  Password *
                </Label>
                <div className="relative">
                  <Input
                    id="signupPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(event) => handleInputChange('password', event.target.value)}
                    className={`${inputClassName} pr-12`}
                    placeholder="Create a password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div className={fieldClassName}>
                <Label htmlFor="confirmPassword" className={labelClassName}>
                  <Lock className="h-4 w-4" />
                  Confirm password *
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={(event) => handleInputChange('confirmPassword', event.target.value)}
                    className={`${inputClassName} pr-12`}
                    placeholder="Confirm your password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label={showConfirmPassword ? 'Hide password confirmation' : 'Show password confirmation'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
                  >
                    {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="h-10 w-full rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 font-medium text-white transition-all hover:from-purple-500 hover:to-blue-500 sm:h-12"
              >
                Continue
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3 sm:space-y-4">
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div className={fieldClassName}>
                  <Label htmlFor="age" className={labelClassName}>Age</Label>
                  <Input
                    id="age"
                    type="number"
                    value={formData.age}
                    onChange={(event) => handleInputChange('age', event.target.value)}
                    className={inputClassName}
                    placeholder="Age"
                    min="1"
                    max="120"
                  />
                </div>

                <div className={fieldClassName}>
                  <Label htmlFor="location" className={labelClassName}>
                    <MapPin className="h-4 w-4" />
                    Location
                  </Label>
                  <Input
                    id="location"
                    type="text"
                    value={formData.location}
                    onChange={(event) => handleInputChange('location', event.target.value)}
                    className={inputClassName}
                    placeholder="City, country"
                  />
                </div>
              </div>

              <div className={fieldClassName}>
                <Label htmlFor="school" className={labelClassName}>
                  <GraduationCap className="h-4 w-4" />
                  School or institution
                </Label>
                <Input
                  id="school"
                  type="text"
                  value={formData.school}
                  onChange={(event) => handleInputChange('school', event.target.value)}
                  className={inputClassName}
                  placeholder="Your school or institution"
                />
              </div>

              <div className={fieldClassName}>
                <Label className={labelClassName}>Grade level</Label>
                <Select
                  value={formData.gradeLevel}
                  onValueChange={(value) => handleInputChange('gradeLevel', value)}
                >
                  <SelectTrigger className="h-10 w-full border-gray-600 bg-gray-800 text-white focus:border-purple-400 sm:h-12">
                    <SelectValue placeholder="Select your grade level" />
                  </SelectTrigger>
                  <SelectContent>
                    {GRADE_LEVELS.map((level) => (
                      <SelectItem key={level} value={level}>{level}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  onClick={() => setStep(1)}
                  variant="outline"
                  className={`${navButtonClassName} border-gray-600 bg-gray-800 text-gray-200 hover:bg-gray-700`}
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  className={`${navButtonClassName} bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-500 hover:to-blue-500`}
                >
                  Continue
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3 sm:space-y-4">
              <div className="space-y-2">
                <Label className={labelClassName}>
                  <BookOpen className="h-4 w-4" />
                  Subjects of interest
                </Label>
                <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 sm:gap-y-2">
                  {SUBJECTS.map((subject) => {
                    const subjectId = `subject-${subject.toLowerCase().replace(/\s+/g, '-')}`;
                    return (
                      <div key={subject} className="flex items-center space-x-2">
                        <Checkbox
                          id={subjectId}
                          checked={formData.subjectsOfInterest.includes(subject)}
                          onCheckedChange={() => handleSubjectToggle(subject)}
                          className="border-gray-300 data-[state=checked]:border-purple-600 data-[state=checked]:bg-purple-600"
                        />
                        <Label htmlFor={subjectId} className="cursor-pointer text-xs text-gray-200 sm:text-sm">
                          {subject}
                        </Label>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className={fieldClassName}>
                <Label htmlFor="learningGoals" className={labelClassName}>
                  <Target className="h-4 w-4" />
                  Learning goals
                </Label>
                <Textarea
                  id="learningGoals"
                  value={formData.learningGoals}
                  onChange={(event) => handleInputChange('learningGoals', event.target.value)}
                  className="min-h-16 resize-none border-gray-600 bg-gray-800 text-white placeholder:text-gray-400 focus:border-purple-400 sm:min-h-20"
                  placeholder="What would you like to achieve?"
                  rows={2}
                />
              </div>

              <div className={fieldClassName}>
                <Label htmlFor="bio" className={labelClassName}>Bio (optional)</Label>
                <Textarea
                  id="bio"
                  value={formData.bio}
                  onChange={(event) => handleInputChange('bio', event.target.value)}
                  className="min-h-16 resize-none border-gray-600 bg-gray-800 text-white placeholder:text-gray-400 focus:border-purple-400 sm:min-h-20"
                  placeholder="Anything else Koro should know?"
                  rows={2}
                />
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  onClick={() => setStep(2)}
                  variant="outline"
                  className={`${navButtonClassName} border-gray-600 bg-gray-800 text-gray-200 hover:bg-gray-700`}
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className={`${navButtonClassName} bg-gradient-to-r from-purple-600 to-blue-600 font-medium text-white hover:from-purple-500 hover:to-blue-500 disabled:opacity-50`}
                >
                  {isLoading ? 'Creating...' : 'Create account'}
                </Button>
              </div>
            </div>
          )}
        </form>

        <div className="mt-3 text-center sm:mt-6">
          <p className="text-xs text-gray-300 sm:text-sm">
            Already have an account?{' '}
            <Link href="/login" className="font-medium text-purple-400 transition-colors hover:text-purple-300">
              Sign in
            </Link>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
