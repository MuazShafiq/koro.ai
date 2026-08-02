'use client';

import { useEffect, useState } from 'react';
import { Download, HardDrive, Save, Trash2, User } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useSupabase } from '@/utils/supabase/provider';

const SETTINGS_KEY = 'koro-local-settings-v1';

interface LocalSettings {
  fullName: string;
  email: string;
  bio: string;
  voiceGuidance: boolean;
  autoSave: boolean;
  gamification: boolean;
  localAnalytics: boolean;
}

const defaultSettings: LocalSettings = {
  fullName: 'Local Learner',
  email: 'learner@local.koro',
  bio: '',
  voiceGuidance: true,
  autoSave: true,
  gamification: true,
  localAnalytics: true,
};

export function LocalSettingsPage() {
  const { supabase } = useSupabase();
  const [settings, setSettings] = useState(defaultSettings);
  const [modelStatus, setModelStatus] = useState<{
    available: boolean;
    model: string;
    error?: string;
  } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(SETTINGS_KEY);
      if (saved) setSettings({ ...defaultSettings, ...JSON.parse(saved) });
    } catch {
      // Defaults remain usable when storage is unavailable.
    }

    fetch('/api/local-ai/status')
      .then((response) => response.json())
      .then(setModelStatus)
      .catch(() => setModelStatus({
        available: false,
        model: 'qwen3:8b',
        error: 'Status check failed',
      }));
  }, []);

  const updateSetting = <Key extends keyof LocalSettings>(
    key: Key,
    value: LocalSettings[Key],
  ) => setSettings((previous) => ({ ...previous, [key]: value }));

  const saveSettings = async () => {
    setIsSaving(true);
    try {
      window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('profiles')
          .update({ full_name: settings.fullName })
          .eq('id', user.id);
      }
      toast.success('Local settings saved');
    } catch (error) {
      console.error('Could not save local settings:', error);
      toast.error('Could not save local settings');
    } finally {
      setIsSaving(false);
    }
  };

  const exportData = async () => {
    try {
      const response = await fetch('/api/local-data');
      const serverData = await response.json();
      if (!response.ok) throw new Error(serverData.error || 'Export failed');

      const browserDatabase = JSON.parse(
        window.localStorage.getItem('koro-local-database-v1') || 'null',
      );
      const payload = {
        ...serverData,
        browserDatabase,
        settings,
      };
      const url = URL.createObjectURL(new Blob(
        [JSON.stringify(payload, null, 2)],
        { type: 'application/json' },
      ));
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `koro-local-export-${new Date().toISOString().slice(0, 10)}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      toast.success('Local data exported');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Export failed');
    }
  };

  const resetLocalData = async () => {
    const confirmed = window.confirm(
      'Reset all Koro data on this computer? This removes progress, sessions, settings, and uploaded PDFs. Export first if you need a backup.',
    );
    if (!confirmed) return;

    setIsResetting(true);
    try {
      const response = await fetch('/api/local-data', { method: 'DELETE' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Reset failed');

      for (const key of Object.keys(window.localStorage)) {
        if (key.startsWith('koro-')) window.localStorage.removeItem(key);
      }
      window.location.assign('/');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Reset failed');
      setIsResetting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-background/50 p-6">
      <div className="mb-8">
        <h1 className="mb-2 text-4xl font-bold">Local settings</h1>
        <p className="text-muted-foreground">
          These settings and learning data stay on this computer.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="glass border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Learner profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="local-full-name">Name</Label>
              <Input
                id="local-full-name"
                value={settings.fullName}
                onChange={(event) => updateSetting('fullName', event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="local-email">Local account label</Label>
              <Input
                id="local-email"
                type="email"
                value={settings.email}
                onChange={(event) => updateSetting('email', event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="local-bio">Learning notes</Label>
              <Textarea
                id="local-bio"
                rows={4}
                value={settings.bio}
                onChange={(event) => updateSetting('bio', event.target.value)}
                placeholder="Goals, preferences, or topics to focus on"
              />
            </div>
            <Button onClick={saveSettings} disabled={isSaving}>
              <Save className="mr-2 h-4 w-4" />
              {isSaving ? 'Saving…' : 'Save settings'}
            </Button>
          </CardContent>
        </Card>

        <Card className="glass border-0">
          <CardHeader>
            <CardTitle>Learning preferences</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {([
              ['voiceGuidance', 'Voice guidance', 'Read tutor messages aloud in the browser'],
              ['autoSave', 'Auto-save progress', 'Persist lesson progress after every section'],
              ['gamification', 'XP and rewards', 'Show local completion rewards'],
              ['localAnalytics', 'Local analytics', 'Calculate private progress summaries on this device'],
            ] as const).map(([key, label, description]) => (
              <div key={key} className="flex items-center justify-between gap-4">
                <div>
                  <Label>{label}</Label>
                  <p className="text-xs text-muted-foreground">{description}</p>
                </div>
                <Switch
                  checked={settings[key]}
                  onCheckedChange={(checked) => updateSetting(key, checked)}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="glass border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HardDrive className="h-5 w-5" />
              Local services
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="font-medium">Ollama</p>
                <p className="text-xs text-muted-foreground">
                  {modelStatus?.model || 'Checking model…'}
                </p>
              </div>
              <span className={modelStatus?.available ? 'text-emerald-400' : 'text-amber-400'}>
                {modelStatus?.available ? 'Ready' : 'Fallback active'}
              </span>
            </div>
            {modelStatus?.error && (
              <p className="text-xs text-muted-foreground">{modelStatus.error}</p>
            )}
          </CardContent>
        </Card>

        <Card className="glass border-destructive/30">
          <CardHeader>
            <CardTitle>Data management</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Export browser progress, tutor sessions, settings, and extracted PDF
              data as JSON, or reset everything stored by local mode.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={exportData}>
                <Download className="mr-2 h-4 w-4" />
                Export local data
              </Button>
              <Button
                variant="destructive"
                onClick={resetLocalData}
                disabled={isResetting}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {isResetting ? 'Resetting…' : 'Reset all local data'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
