'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Palette,
  Sun,
  Moon,
  Monitor,
  Sparkles,
  Eye,
  Zap,
  Waves,
  Settings,
  Save,
  RotateCcw,
  Download,
  Upload,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useStore } from '@/lib/store';

interface ColorTheme {
  id: string;
  name: string;
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  preview: string[];
}

interface AnimationPreset {
  id: string;
  name: string;
  description: string;
  intensity: number;
  type: 'smooth' | 'bouncy' | 'sharp' | 'elastic';
}

const colorThemes: ColorTheme[] = [
  {
    id: 'electric',
    name: 'Electric Blue',
    primary: '#3B82F6',
    secondary: '#8B5CF6',
    accent: '#06B6D4',
    background: 'from-blue-900/20 to-purple-900/20',
    preview: ['#3B82F6', '#8B5CF6', '#06B6D4'],
  },
  {
    id: 'neon',
    name: 'Neon Dreams',
    primary: '#FF0080',
    secondary: '#00FF80',
    accent: '#8000FF',
    background: 'from-pink-900/20 to-green-900/20',
    preview: ['#FF0080', '#00FF80', '#8000FF'],
  },
  {
    id: 'sunset',
    name: 'Sunset Glow',
    primary: '#FF6B35',
    secondary: '#F7931E',
    accent: '#FFD23F',
    background: 'from-orange-900/20 to-yellow-900/20',
    preview: ['#FF6B35', '#F7931E', '#FFD23F'],
  },
  {
    id: 'ocean',
    name: 'Ocean Depths',
    primary: '#0077BE',
    secondary: '#00A8CC',
    accent: '#40E0D0',
    background: 'from-blue-900/20 to-cyan-900/20',
    preview: ['#0077BE', '#00A8CC', '#40E0D0'],
  },
  {
    id: 'forest',
    name: 'Forest Mystique',
    primary: '#228B22',
    secondary: '#32CD32',
    accent: '#90EE90',
    background: 'from-green-900/20 to-emerald-900/20',
    preview: ['#228B22', '#32CD32', '#90EE90'],
  },
  {
    id: 'cosmic',
    name: 'Cosmic Purple',
    primary: '#6A0DAD',
    secondary: '#9370DB',
    accent: '#DDA0DD',
    background: 'from-purple-900/20 to-violet-900/20',
    preview: ['#6A0DAD', '#9370DB', '#DDA0DD'],
  },
];

const animationPresets: AnimationPreset[] = [
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Subtle and clean animations',
    intensity: 0.3,
    type: 'smooth',
  },
  {
    id: 'standard',
    name: 'Standard',
    description: 'Balanced motion and transitions',
    intensity: 0.6,
    type: 'smooth',
  },
  {
    id: 'dynamic',
    name: 'Dynamic',
    description: 'Energetic and engaging',
    intensity: 0.8,
    type: 'bouncy',
  },
  {
    id: 'playful',
    name: 'Playful',
    description: 'Fun and bouncy interactions',
    intensity: 1.0,
    type: 'elastic',
  },
];

interface ThemeEngineProps {
  className?: string;
}

function cssHslValue(hex: string): string {
  const normalized = hex.replace('#', '');
  if (!/^[0-9a-f]{6}$/i.test(normalized)) return hex;

  const red = parseInt(normalized.slice(0, 2), 16) / 255;
  const green = parseInt(normalized.slice(2, 4), 16) / 255;
  const blue = parseInt(normalized.slice(4, 6), 16) / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const lightness = (max + min) / 2;
  const delta = max - min;
  let hue = 0;

  if (delta !== 0) {
    if (max === red) hue = ((green - blue) / delta) % 6;
    else if (max === green) hue = (blue - red) / delta + 2;
    else hue = (red - green) / delta + 4;
    hue *= 60;
    if (hue < 0) hue += 360;
  }

  const saturation = delta === 0
    ? 0
    : delta / (1 - Math.abs(2 * lightness - 1));

  return `${Math.round(hue)} ${Math.round(saturation * 100)}% ${Math.round(lightness * 100)}%`;
}

export const ThemeEngine: React.FC<ThemeEngineProps> = ({ className }) => {
  const { 
    theme, 
    reducedMotion,
    setTheme, 
    toggleReducedMotion
  } = useStore();
  
  const [selectedTheme, setSelectedTheme] = useState(colorThemes[0]);
  const [selectedAnimation, setSelectedAnimation] = useState(animationPresets[1]);
  const [glassIntensity, setGlassIntensity] = useState(0.7);
  const [particleEffects, setParticleEffects] = useState(true);
  const [customColors, setCustomColors] = useState({
    primary: '#3B82F6',
    secondary: '#8B5CF6',
    accent: '#06B6D4',
  });
  const [previewMode, setPreviewMode] = useState(false);

  // Apply theme changes to CSS variables
  useEffect(() => {
    const root = document.documentElement;
    
    if (previewMode) {
      root.style.setProperty('--primary', cssHslValue(selectedTheme.primary));
      root.style.setProperty('--secondary', cssHslValue(selectedTheme.secondary));
      root.style.setProperty('--accent', cssHslValue(selectedTheme.accent));
      root.style.setProperty('--glass-opacity', glassIntensity.toString());
    }
  }, [selectedTheme, glassIntensity, previewMode]);

  const applyTheme = () => {
    const root = document.documentElement;
    root.style.setProperty('--primary', cssHslValue(selectedTheme.primary));
    root.style.setProperty('--secondary', cssHslValue(selectedTheme.secondary));
    root.style.setProperty('--accent', cssHslValue(selectedTheme.accent));
    root.style.setProperty('--glass-opacity', glassIntensity.toString());
    
    // Motion intensity is no longer supported
    // Using reducedMotion toggle instead
    setPreviewMode(false);
  };

  const resetToDefault = () => {
    setSelectedTheme(colorThemes[0]);
    setSelectedAnimation(animationPresets[1]);
    setGlassIntensity(0.7);
    setParticleEffects(true);
    setPreviewMode(false);
    
    const root = document.documentElement;
    root.style.setProperty('--primary', cssHslValue('#3B82F6'));
    root.style.setProperty('--secondary', cssHslValue('#8B5CF6'));
    root.style.setProperty('--accent', cssHslValue('#06B6D4'));
    root.style.setProperty('--glass-opacity', '0.7');
  };

  const exportTheme = () => {
    const themeConfig = {
      colorTheme: selectedTheme,
      animationPreset: selectedAnimation,
      glassIntensity,
      particleEffects,
      customColors,
    };
    
    const dataStr = JSON.stringify(themeConfig, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = 'koro-theme.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <Card className={cn("glass border-0", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-electric-blue to-violet flex items-center justify-center">
              <Palette className="w-5 h-5 text-white" />
            </div>
            <div>
              <CardTitle>Theme Engine</CardTitle>
              <p className="text-sm text-muted-foreground">Customize your learning experience</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPreviewMode(!previewMode)}
              className={cn(
                "glass border-white/20",
                previewMode && "bg-electric-blue text-white"
              )}
            >
              <Eye className="w-4 h-4" />
              Preview
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={exportTheme}
              className="glass border-white/20"
            >
              <Download className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <Tabs defaultValue="colors" className="space-y-6">
          <TabsList className="glass border-white/20 grid w-full grid-cols-4">
            <TabsTrigger value="colors" className="flex items-center gap-2">
              <Palette className="w-4 h-4" />
              Colors
            </TabsTrigger>
            <TabsTrigger value="animations" className="flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Motion
            </TabsTrigger>
            <TabsTrigger value="effects" className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Effects
            </TabsTrigger>
            <TabsTrigger value="accessibility" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Access
            </TabsTrigger>
          </TabsList>

          <TabsContent value="colors" className="space-y-6">
            {/* Color Themes */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Color Themes</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {colorThemes.map((theme) => (
                  <motion.div
                    key={theme.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedTheme(theme)}
                    className={cn(
                      "p-4 rounded-lg border-2 cursor-pointer transition-all",
                      "glass hover:bg-white/10",
                      selectedTheme.id === theme.id
                        ? "border-electric-blue bg-electric-blue/10"
                        : "border-white/20"
                    )}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex gap-1">
                        {theme.preview.map((color, index) => (
                          <div
                            key={index}
                            className="w-4 h-4 rounded-full border border-white/20"
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                      {selectedTheme.id === theme.id && (
                        <Badge variant="secondary" className="text-xs">
                          Active
                        </Badge>
                      )}
                    </div>
                    <h4 className="font-medium text-foreground">{theme.name}</h4>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Custom Colors */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Custom Colors</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Object.entries(customColors).map(([key, value]) => (
                  <div key={key} className="space-y-2">
                    <Label className="text-sm font-medium capitalize">{key}</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={value}
                        onChange={(e) => setCustomColors(prev => ({
                          ...prev,
                          [key]: e.target.value
                        }))}
                        className="w-12 h-8 rounded border border-white/20 bg-transparent cursor-pointer"
                      />
                      <div className="flex-1 p-2 rounded bg-white/5 border border-white/10 text-sm font-mono">
                        {value}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="animations" className="space-y-6">
            {/* Animation Presets */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Animation Presets</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {animationPresets.map((preset) => (
                  <motion.div
                    key={preset.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedAnimation(preset)}
                    className={cn(
                      "p-4 rounded-lg border-2 cursor-pointer transition-all",
                      "glass hover:bg-white/10",
                      selectedAnimation.id === preset.id
                        ? "border-electric-blue bg-electric-blue/10"
                        : "border-white/20"
                    )}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-foreground">{preset.name}</h4>
                      {selectedAnimation.id === preset.id && (
                        <Badge variant="secondary" className="text-xs">
                          Active
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">{preset.description}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Intensity:</span>
                      <div className="flex-1 bg-white/10 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-electric-blue to-violet h-2 rounded-full transition-all"
                          style={{ width: `${preset.intensity * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {Math.round(preset.intensity * 100)}%
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Motion Settings */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Motion Settings</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Reduce Motion</Label>
                    <p className="text-xs text-muted-foreground">Minimize animations for accessibility</p>
                  </div>
                  <Switch
                    checked={reducedMotion}
                    onCheckedChange={toggleReducedMotion}
                  />
                </div>
                
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-sm font-medium">Motion Intensity</Label>
                    <span className="text-sm text-muted-foreground">
                      {reducedMotion ? "Off" : "On"}
                    </span>
                  </div>
                  <Slider
                    value={[reducedMotion ? 0 : 1]}
                    onValueChange={(value) => toggleReducedMotion()}
                    max={1}
                    min={0}
                    step={0.1}
                    className="w-full"
                    disabled={reducedMotion}
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="effects" className="space-y-6">
            {/* Glass Effects */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Glass Effects</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-sm font-medium">Glass Intensity</Label>
                    <span className="text-sm text-muted-foreground">
                      {Math.round(glassIntensity * 100)}%
                    </span>
                  </div>
                  <Slider
                    value={[glassIntensity]}
                    onValueChange={(value) => setGlassIntensity(value[0])}
                    max={1}
                    min={0}
                    step={0.1}
                    className="w-full"
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Particle Effects</Label>
                    <p className="text-xs text-muted-foreground">Floating particles and ambient effects</p>
                  </div>
                  <Switch
                    checked={particleEffects}
                    onCheckedChange={setParticleEffects}
                  />
                </div>
              </div>
            </div>

            {/* Preview */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Preview</h3>
              <div className="p-6 rounded-lg glass border border-white/20 space-y-4">
                <div className="flex items-center gap-4">
                  <motion.div
                    animate={{ 
                      scale: previewMode ? [1, 1.1, 1] : 1,
                      rotate: previewMode ? [0, 5, -5, 0] : 0 
                    }}
                    transition={{ 
                      duration: 2, 
                      repeat: previewMode ? Infinity : 0,
                      ease: selectedAnimation.type === 'bouncy' ? 'easeInOut' : 'linear'
                    }}
                    className="w-16 h-16 rounded-lg bg-gradient-to-r from-electric-blue to-violet flex items-center justify-center"
                  >
                    <Sparkles className="w-8 h-8 text-white" />
                  </motion.div>
                  <div>
                    <h4 className="font-medium text-foreground">Sample Component</h4>
                    <p className="text-sm text-muted-foreground">This shows how your theme will look</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-2">
                  {selectedTheme.preview.map((color, index) => (
                    <motion.div
                      key={index}
                      animate={previewMode ? {
                        y: [0, -10, 0],
                      } : {}}
                      transition={{
                        duration: 1,
                        repeat: previewMode ? Infinity : 0,
                        delay: index * 0.2,
                      }}
                      className="h-12 rounded border border-white/20"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="accessibility" className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Accessibility Options</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">High Contrast Mode</Label>
                    <p className="text-xs text-muted-foreground">Increase contrast for better visibility</p>
                  </div>
                  <Switch />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Large Text</Label>
                    <p className="text-xs text-muted-foreground">Increase font sizes throughout the app</p>
                  </div>
                  <Switch />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Focus Indicators</Label>
                    <p className="text-xs text-muted-foreground">Enhanced keyboard navigation</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-6 border-t border-white/10">
          <Button
            variant="ghost"
            onClick={resetToDefault}
            className="glass border-white/20"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset to Default
          </Button>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={exportTheme}
              className="glass border-white/20"
            >
              <Download className="w-4 h-4 mr-2" />
              Export Theme
            </Button>
            <Button
              onClick={applyTheme}
              className="bg-gradient-to-r from-electric-blue to-violet hover:from-electric-blue/80 hover:to-violet/80"
            >
              <Save className="w-4 h-4 mr-2" />
              Apply Theme
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ThemeEngine;
