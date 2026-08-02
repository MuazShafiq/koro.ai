'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { 
  User, 
  Bell, 
  Shield, 
  Globe, 
  Smartphone,
  Download,
  Trash2,
  HelpCircle,
  Palette
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { ThemeEngine } from '@/components/theme/ThemeEngine';
import { useAppStore } from '@/lib/store';

export default function SettingsPage() {
  const { userProgress } = useAppStore();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="page-container min-h-full pb-12"
    >
      {/* Header */}
      <div className="surface-panel mb-7 rounded-[1.75rem] p-6 md:p-8">
        <p className="section-kicker mb-2">Preferences</p>
        <h1 className="text-gradient text-3xl font-bold tracking-tight md:text-4xl">Make Koro yours</h1>
        <p className="mt-2 text-sm text-muted-foreground md:text-base">Control your experience, account, privacy, and learning preferences.</p>
      </div>

      <Tabs defaultValue="appearance" className="space-y-6">
        <TabsList className="grid h-auto w-full grid-cols-2 gap-1 rounded-xl border border-white/[0.07] bg-white/[0.025] p-1 sm:grid-cols-5">
          <TabsTrigger value="appearance" className="flex items-center gap-2">
            <Palette className="w-4 h-4" />
            Appearance
          </TabsTrigger>
          <TabsTrigger value="account" className="flex items-center gap-2">
            <User className="w-4 h-4" />
            Account
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="w-4 h-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="privacy" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Privacy
          </TabsTrigger>
          <TabsTrigger value="advanced" className="flex items-center gap-2">
            <Globe className="w-4 h-4" />
            Advanced
          </TabsTrigger>
        </TabsList>

        <TabsContent value="appearance" className="space-y-6">
          <ThemeEngine />
        </TabsContent>

        <TabsContent value="account" className="space-y-6">
          {/* Profile Information */}
          <Card className="glass border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Profile Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input 
                    id="firstName" 
                    defaultValue="Alex" 
                    className="glass border-white/20" 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input 
                    id="lastName" 
                    defaultValue="Johnson" 
                    className="glass border-white/20" 
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input 
                  id="email" 
                  type="email" 
                  defaultValue="alex.johnson@example.com" 
                  className="glass border-white/20" 
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea 
                  id="bio" 
                  placeholder="Tell us about yourself..." 
                  className="glass border-white/20" 
                  rows={3}
                />
              </div>
              
              <div className="flex gap-2">
                <Button className="bg-gradient-to-r from-electric-blue to-violet">
                  Save Changes
                </Button>
                <Button variant="outline" className="glass border-white/20">
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Learning Preferences */}
          <Card className="glass border-0">
            <CardHeader>
              <CardTitle>Learning Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Voice Guidance</Label>
                  <p className="text-xs text-muted-foreground">Enable voice instructions during lessons</p>
                </div>
                <Switch defaultChecked />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Auto-save Progress</Label>
                  <p className="text-xs text-muted-foreground">Automatically save your learning progress</p>
                </div>
                <Switch defaultChecked />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Gamification</Label>
                  <p className="text-xs text-muted-foreground">Show achievements and progress rewards</p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          {/* Push Notifications */}
          <Card className="glass border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Push Notifications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Study Reminders</Label>
                  <p className="text-xs text-muted-foreground">Get reminded about your study sessions</p>
                </div>
                <Switch defaultChecked />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Achievement Alerts</Label>
                  <p className="text-xs text-muted-foreground">Notifications when you earn new achievements</p>
                </div>
                <Switch defaultChecked />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Weekly Progress</Label>
                  <p className="text-xs text-muted-foreground">Weekly summary of your learning progress</p>
                </div>
                <Switch />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">New Content</Label>
                  <p className="text-xs text-muted-foreground">Alerts about new lessons and features</p>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>

          {/* Email Notifications */}
          <Card className="glass border-0">
            <CardHeader>
              <CardTitle>Email Notifications</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Daily Digest</Label>
                  <p className="text-xs text-muted-foreground">Daily summary of your activities</p>
                </div>
                <Switch />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Marketing Updates</Label>
                  <p className="text-xs text-muted-foreground">News about Koro.ai features and updates</p>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="privacy" className="space-y-6">
          {/* Data & Privacy */}
          <Card className="glass border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Data & Privacy
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Analytics Collection</Label>
                  <p className="text-xs text-muted-foreground">Help improve Koro.ai by sharing usage data</p>
                </div>
                <Switch defaultChecked />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Personalized Recommendations</Label>
                  <p className="text-xs text-muted-foreground">Use your data to suggest relevant content</p>
                </div>
                <Switch defaultChecked />
              </div>
              
              <Separator className="my-4" />
              
              <div className="space-y-2">
                <h4 className="font-medium">Data Management</h4>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="glass border-white/20">
                    <Download className="w-4 h-4 mr-2" />
                    Export Data
                  </Button>
                  <Button variant="destructive" size="sm">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Account
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Security */}
          <Card className="glass border-0">
            <CardHeader>
              <CardTitle>Security</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input 
                  id="currentPassword" 
                  type="password" 
                  className="glass border-white/20" 
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input 
                  id="newPassword" 
                  type="password" 
                  className="glass border-white/20" 
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input 
                  id="confirmPassword" 
                  type="password" 
                  className="glass border-white/20" 
                />
              </div>
              
              <Button className="bg-gradient-to-r from-electric-blue to-violet">
                Update Password
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="advanced" className="space-y-6">
          {/* Advanced Settings */}
          <Card className="glass border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5" />
                Advanced Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Developer Mode</Label>
                  <p className="text-xs text-muted-foreground">Enable advanced debugging features</p>
                </div>
                <Switch />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Beta Features</Label>
                  <p className="text-xs text-muted-foreground">Access experimental features early</p>
                </div>
                <Switch />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Offline Mode</Label>
                  <p className="text-xs text-muted-foreground">Download content for offline access</p>
                </div>
                <Switch />
              </div>
              
              <Separator className="my-4" />
              
              <div className="space-y-2">
                <h4 className="font-medium">Storage & Cache</h4>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="glass border-white/20">
                    Clear Cache
                  </Button>
                  <Button variant="outline" size="sm" className="glass border-white/20">
                    Reset Settings
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Support */}
          <Card className="glass border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5" />
                Support & Help
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button variant="outline" className="glass border-white/20 justify-start">
                  <HelpCircle className="w-4 h-4 mr-2" />
                  Help Center
                </Button>
                <Button variant="outline" className="glass border-white/20 justify-start">
                  <Smartphone className="w-4 h-4 mr-2" />
                  Contact Support
                </Button>
              </div>
              
              <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                <h4 className="font-medium mb-2">App Version</h4>
                <p className="text-sm text-muted-foreground">Koro.ai v2.1.0</p>
                <p className="text-xs text-muted-foreground mt-1">Last updated: January 2024</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
