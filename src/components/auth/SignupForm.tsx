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
import { useSupabase } from '@/utils/supabase/provider';
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
  const [step, setStep] = useState(1);
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
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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

  return (
    <Card className="w-full shadow-2xl border border-gray-700 bg-gray-900/90 backdrop-blur-sm">
      <CardHeader className="text-center pb-4">
        <CardTitle className="text-2xl font-bold text-gray-100">
          {step === 1 ? 'Create Account' : 'Tell us about yourself'}
        </CardTitle>
        <CardDescription className="text-gray-300">
          {step === 1 ? 'Enter your basic information' : 'Help us personalize your experience'}
        </CardDescription>
        <div className="flex justify-center mt-4">
          <div className="flex space-x-2">
            <div className={`w-3 h-3 rounded-full transition-colors ${
              step >= 1 ? 'bg-purple-500' : 'bg-gray-300'
            }`} />
            <div className={`w-3 h-3 rounded-full transition-colors ${
              step >= 2 ? 'bg-purple-500' : 'bg-gray-300'
            }`} />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-sm font-medium text-gray-200 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Full Name *
                </Label>
                <Input
                  id="fullName"
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => handleInputChange('fullName', e.target.value)}
                  className="h-12 bg-gray-800 border-gray-600 text-white placeholder:text-gray-400 focus:border-purple-400 focus:ring-purple-400"
                  placeholder="Enter your full name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-gray-200 flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Email *
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="h-12 bg-gray-800 border-gray-600 text-white placeholder:text-gray-400 focus:border-purple-400 focus:ring-purple-400"
                  placeholder="Enter your email"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-gray-200 flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  Password *
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    className="h-12 bg-gray-800 border-gray-600 text-white placeholder:text-gray-400 focus:border-purple-400 focus:ring-purple-400 pr-12"
                    placeholder="Create a password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-200"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-200 flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  Confirm Password *
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                    className="h-12 bg-gray-800 border-gray-600 text-white placeholder:text-gray-400 focus:border-purple-400 focus:ring-purple-400 pr-12"
                    placeholder="Confirm your password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-200"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <Button
                type="button"
                onClick={handleNextStep}
                className="w-full h-12 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium rounded-lg transition-all duration-200 transform hover:scale-[1.02]"
              >
                Continue
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="age" className="text-sm font-medium text-gray-200">
                    Age
                  </Label>
                  <Input
                    id="age"
                    type="number"
                    value={formData.age}
                    onChange={(e) => handleInputChange('age', e.target.value)}
                    className="h-12 bg-gray-800 border-gray-600 text-white placeholder:text-gray-400 focus:border-purple-400 focus:ring-purple-400"
                    placeholder="Your age"
                    min="1"
                    max="120"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location" className="text-sm font-medium text-gray-200 flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Location
                  </Label>
                  <Input
                    id="location"
                    type="text"
                    value={formData.location}
                    onChange={(e) => handleInputChange('location', e.target.value)}
                    className="h-12 bg-gray-800 border-gray-600 text-white placeholder:text-gray-400 focus:border-purple-400 focus:ring-purple-400"
                    placeholder="City, Country"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="school" className="text-sm font-medium text-gray-200 flex items-center gap-2">
                  <GraduationCap className="w-4 h-4" />
                  School/Institution
                </Label>
                <Input
                  id="school"
                  type="text"
                  value={formData.school}
                  onChange={(e) => handleInputChange('school', e.target.value)}
                  className="h-12 bg-gray-800 border-gray-600 text-white placeholder:text-gray-400 focus:border-purple-400 focus:ring-purple-400"
                  placeholder="Your school or institution"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-200">
                  Grade Level
                </Label>
                <Select value={formData.gradeLevel} onValueChange={(value) => handleInputChange('gradeLevel', value)}>
                  <SelectTrigger className="h-12 bg-gray-800 border-gray-600 text-white focus:border-purple-400 focus:ring-purple-400">
                    <SelectValue placeholder="Select your grade level" />
                  </SelectTrigger>
                  <SelectContent>
                    {GRADE_LEVELS.map((level) => (
                      <SelectItem key={level} value={level}>
                        {level}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-medium text-gray-200 flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  Subjects of Interest
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  {SUBJECTS.map((subject) => (
                    <div key={subject} className="flex items-center space-x-2">
                      <Checkbox
                        id={subject}
                        checked={formData.subjectsOfInterest.includes(subject)}
                        onCheckedChange={() => handleSubjectToggle(subject)}
                        className="border-gray-300 data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600"
                      />
                      <Label htmlFor={subject} className="text-sm text-gray-200 cursor-pointer">
                        {subject}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="learningGoals" className="text-sm font-medium text-gray-200 flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Learning Goals
                </Label>
                <Textarea
                  id="learningGoals"
                  value={formData.learningGoals}
                  onChange={(e) => handleInputChange('learningGoals', e.target.value)}
                  className="bg-gray-800 border-gray-600 text-white placeholder:text-gray-400 focus:border-purple-400 focus:ring-purple-400 resize-none"
                  placeholder="What do you hope to achieve with your learning?"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio" className="text-sm font-medium text-gray-200">
                  Bio (Optional)
                </Label>
                <Textarea
                  id="bio"
                  value={formData.bio}
                  onChange={(e) => handleInputChange('bio', e.target.value)}
                  className="bg-gray-800 border-gray-600 text-white placeholder:text-gray-400 focus:border-purple-400 focus:ring-purple-400 resize-none"
                  placeholder="Tell us a bit about yourself..."
                  rows={3}
                />
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  onClick={() => setStep(1)}
                  variant="outline"
                  className="flex-1 h-12 border-gray-600 text-gray-200 bg-gray-800 hover:bg-gray-700"
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 h-12 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium rounded-lg transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {isLoading ? 'Creating Account...' : 'Create Account'}
                </Button>
              </div>
            </div>
          )}
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-300">
            Already have an account?{' '}
            <Link href="/login" className="text-purple-400 hover:text-purple-300 font-medium transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}