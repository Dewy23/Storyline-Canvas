import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, Check, X, Loader2, Image, Video, Volume2, Plus, Trash2, Edit2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAppStore } from "@/lib/store";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { AIProvider, APISetting } from "@shared/schema";
import { SiOpenai, SiGoogle, SiAdobe } from "react-icons/si";

interface ProviderConfig {
  id: AIProvider;
  name: string;
  description: string;
  docUrl?: string;
  isFree?: boolean;
}

const imageProviders: ProviderConfig[] = [
  { id: "pollinations", name: "Pollinations.ai", description: "100% free open-source AI - no key required", docUrl: "https://pollinations.ai", isFree: true },
  { id: "huggingface", name: "Hugging Face", description: "Free tier with access to FLUX.1 and thousands of models", docUrl: "https://huggingface.co/settings/tokens", isFree: true },
  { id: "replicate", name: "Replicate", description: "Free starter credits to run open-source models", docUrl: "https://replicate.com/account/api-tokens", isFree: true },
  { id: "openai", name: "OpenAI (DALL-E)", description: "DALL-E 3 and GPT-4 Vision image generation", docUrl: "https://platform.openai.com/api-keys" },
  { id: "gemini", name: "Google Gemini", description: "Google's Gemini multimodal AI for image generation", docUrl: "https://aistudio.google.com/apikey" },
  { id: "stability", name: "Stability AI", description: "Stable Diffusion XL and other models", docUrl: "https://platform.stability.ai/account/keys" },
  { id: "flux", name: "Flux", description: "Black Forest Labs FLUX.1 via Replicate token", docUrl: "https://replicate.com/account/api-tokens" },
  { id: "ideogram", name: "Ideogram", description: "AI image generation with excellent text rendering", docUrl: "https://ideogram.ai/manage-api" },
  { id: "hunyuan", name: "Hunyuan (Tencent)", description: "Tencent's AI image generation model", docUrl: "https://cloud.tencent.com/product/hunyuan" },
  { id: "firefly", name: "Adobe Firefly", description: "Adobe's creative AI for image generation", docUrl: "https://developer.adobe.com/firefly-api/api/" },
  { id: "bria", name: "Bria.ai", description: "Enterprise AI for visual content generation", docUrl: "https://bria.ai/api" },
  { id: "runware", name: "Runware", description: "Fast AI image generation API", docUrl: "https://runware.ai" },
];

const videoProviders: ProviderConfig[] = [
  { id: "runway", name: "Runway ML", description: "Gen-3 Alpha video generation and editing", docUrl: "https://app.runwayml.com/settings/api" },
  { id: "veo", name: "Google Veo", description: "Google's AI video generation model", docUrl: "https://cloud.google.com/vertex-ai" },
  { id: "kling", name: "Kling", description: "High-quality AI video generation", docUrl: "https://wavespeed.ai" },
  { id: "pika", name: "Pika Labs", description: "Creative AI video generation", docUrl: "https://pika.art" },
  { id: "luma", name: "Luma Dream Machine", description: "AI-powered video and 3D generation", docUrl: "https://lumalabs.ai" },
  { id: "tavus", name: "Tavus", description: "AI video personalization", docUrl: "https://www.tavus.io" },
  { id: "mootion", name: "Mootion", description: "AI motion and video", docUrl: "https://mootion.ai" },
  { id: "akool", name: "Akool", description: "AI video creation", docUrl: "https://akool.com" },
  { id: "mirage", name: "Mirage", description: "AI video generation", docUrl: "https://mirage.ai" },
  { id: "pictory", name: "Pictory", description: "AI video from text", docUrl: "https://pictory.ai" },
];

const audioProviders: ProviderConfig[] = [
  { id: "elevenlabs", name: "ElevenLabs", description: "AI voice and audio generation", docUrl: "https://elevenlabs.io/app/settings/api-keys" },
];

const allProviders = [...imageProviders, ...videoProviders, ...audioProviders];

function getProviderConfig(providerId: AIProvider): ProviderConfig | undefined {
  return allProviders.find((p) => p.id === providerId);
}

function getProviderIcon(providerId: AIProvider) {
  switch (providerId) {
    case "openai":
      return <SiOpenai className="w-5 h-5" />;
    case "gemini":
    case "veo":
      return <SiGoogle className="w-5 h-5" />;
    case "firefly":
      return <SiAdobe className="w-5 h-5" />;
    default:
      return null;
  }
}

function getProviderCategory(providerId: AIProvider): "image" | "video" | "audio" {
  if (imageProviders.some((p) => p.id === providerId)) return "image";
  if (videoProviders.some((p) => p.id === providerId)) return "video";
  return "audio";
}

interface SettingRowProps {
  setting: APISetting;
  onUpdate: (id: string, apiKey: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, newName: string) => void;
  isSaving: boolean;
  isDeleting: boolean;
}

function SettingRow({
  setting,
  onUpdate,
  onDelete,
  onRename,
  isSaving,
  isDeleting,
}: SettingRowProps) {
  const [showKey, setShowKey] = useState(false);
  const [editingKey, setEditingKey] = useState("");
  const [isEditing, setIsEditing] = useState(!setting.isConnected);
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(setting.instanceName);
  
  const config = getProviderConfig(setting.provider);
  const icon = getProviderIcon(setting.provider);

  const handleSave = () => {
    if (editingKey) {
      onUpdate(setting.id, editingKey);
      setEditingKey("");
      setIsEditing(false);
    }
  };

  const handleRename = () => {
    if (newName && newName !== setting.instanceName) {
      onRename(setting.id, newName);
    }
    setIsRenaming(false);
  };

  return (
    <div
      className="p-3 border rounded-md space-y-2"
      data-testid={`setting-row-${setting.id}`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center text-muted-foreground shrink-0">
            {icon || (
              <span className="text-xs font-semibold">
                {config?.name.slice(0, 2).toUpperCase() || "AI"}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            {isRenaming ? (
              <div className="flex items-center gap-1">
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="h-7 text-sm"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleRename();
                    if (e.key === "Escape") setIsRenaming(false);
                  }}
                />
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleRename}>
                  <Check className="w-3 h-3" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-sm">{setting.instanceName}</span>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-5 w-5"
                  onClick={() => setIsRenaming(true)}
                >
                  <Edit2 className="w-3 h-3" />
                </Button>
                {setting.isConnected && (
                  <Badge variant="secondary" className="gap-1 bg-green-500/10 text-green-600 dark:text-green-400 text-xs">
                    <Check className="w-3 h-3" />
                    Connected
                  </Badge>
                )}
                {config?.isFree && (
                  <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs">
                    Free
                  </Badge>
                )}
              </div>
            )}
            <p className="text-xs text-muted-foreground truncate">
              {config?.description || setting.provider}
            </p>
          </div>
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
          onClick={() => onDelete(setting.id)}
          disabled={isDeleting}
        >
          {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
        </Button>
      </div>

      {!config?.isFree && (
        <div className="flex gap-2">
          {isEditing || !setting.isConnected ? (
            <>
              <div className="relative flex-1">
                <Input
                  type={showKey ? "text" : "password"}
                  placeholder="Enter API key..."
                  value={editingKey}
                  onChange={(e) => setEditingKey(e.target.value)}
                  className="pr-10 font-mono text-xs h-9"
                  data-testid={`input-api-key-${setting.id}`}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={() => setShowKey(!showKey)}
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
              <Button
                onClick={handleSave}
                disabled={!editingKey || isSaving}
                data-testid={`button-save-${setting.id}`}
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
              </Button>
            </>
          ) : (
            <div className="flex items-center gap-2 flex-1">
              <Input
                type="password"
                value="••••••••••••"
                disabled
                className="font-mono text-xs h-9 flex-1"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
              >
                Change Key
              </Button>
            </div>
          )}
        </div>
      )}
      
      {config?.docUrl && !config.isFree && !setting.isConnected && (
        <a
          href={config.docUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-muted-foreground hover:text-foreground underline"
        >
          Get API key
        </a>
      )}
    </div>
  );
}

export function SettingsModal() {
  const { isSettingsOpen, setSettingsOpen, apiSettings, setApiSettings, addApiSetting, removeApiSetting, updateApiSettingInStore } = useAppStore();
  const [selectedProvider, setSelectedProvider] = useState<string>("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const saveSettingMutation = useMutation({
    mutationFn: async (data: { provider: AIProvider; instanceName: string; apiKey: string }) => {
      const response = await apiRequest("POST", "/api/settings", data);
      return response.json() as Promise<APISetting>;
    },
    onSuccess: (savedSetting) => {
      addApiSetting(savedSetting);
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
    },
  });

  const updateSettingMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<APISetting> }) => {
      const response = await apiRequest("PATCH", `/api/settings/${id}`, updates);
      return response.json() as Promise<APISetting>;
    },
    onSuccess: (updatedSetting) => {
      updateApiSettingInStore(updatedSetting.id, updatedSetting);
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
    },
  });

  const deleteSettingMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/settings/${id}`),
    onSuccess: (_, id) => {
      removeApiSetting(id);
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
    },
  });

  const handleAddProvider = () => {
    if (!selectedProvider) return;
    
    const config = getProviderConfig(selectedProvider as AIProvider);
    if (!config) return;

    const existingCount = apiSettings.filter((s) => s.provider === selectedProvider).length;
    const instanceName = existingCount > 0 
      ? `${config.name} ${existingCount + 1}`
      : config.name;

    if (config.isFree) {
      saveSettingMutation.mutate({
        provider: selectedProvider as AIProvider,
        instanceName,
        apiKey: "",
      }, {
        onSuccess: () => {
          toast({
            title: "Provider added",
            description: `${instanceName} is now available`,
          });
          setSelectedProvider("");
        },
      });
    } else {
      const tempId = `temp-${Date.now()}`;
      const newSetting: APISetting = {
        id: tempId,
        provider: selectedProvider as AIProvider,
        instanceName,
        apiKey: "",
        isConnected: false,
      };
      addApiSetting(newSetting);
      setSelectedProvider("");
    }
  };

  const handleUpdateKey = async (id: string, apiKey: string) => {
    const setting = apiSettings.find((s) => s.id === id);
    if (!setting) return;

    if (setting.id.startsWith("temp-")) {
      const config = getProviderConfig(setting.provider);
      saveSettingMutation.mutate({
        provider: setting.provider,
        instanceName: setting.instanceName,
        apiKey,
      }, {
        onSuccess: (savedSetting) => {
          removeApiSetting(id);
          toast({
            title: "API key saved",
            description: `${savedSetting.instanceName} connected successfully`,
          });
        },
        onError: () => {
          toast({
            title: "Failed to save API key",
            description: "Please check your key and try again",
            variant: "destructive",
          });
        },
      });
    } else {
      updateSettingMutation.mutate({ id, updates: { apiKey } }, {
        onSuccess: (savedSetting) => {
          toast({
            title: "API key updated",
            description: `${savedSetting.instanceName} connected successfully`,
          });
        },
        onError: () => {
          toast({
            title: "Failed to update API key",
            description: "Please check your key and try again",
            variant: "destructive",
          });
        },
      });
    }
  };

  const handleRename = async (id: string, newName: string) => {
    if (id.startsWith("temp-")) {
      updateApiSettingInStore(id, { instanceName: newName });
    } else {
      updateSettingMutation.mutate({ id, updates: { instanceName: newName } });
    }
  };

  const handleDelete = (id: string) => {
    if (id.startsWith("temp-")) {
      removeApiSetting(id);
    } else {
      const setting = apiSettings.find((s) => s.id === id);
      deleteSettingMutation.mutate(id, {
        onSuccess: () => {
          toast({
            title: "Removed",
            description: `${setting?.instanceName || "Provider"} has been removed`,
          });
        },
      });
    }
  };

  const imageSettings = apiSettings.filter((s) => getProviderCategory(s.provider) === "image");
  const videoSettings = apiSettings.filter((s) => getProviderCategory(s.provider) === "video");
  const audioSettings = apiSettings.filter((s) => getProviderCategory(s.provider) === "audio");

  const connectedImageCount = imageSettings.filter((s) => s.isConnected).length;
  const connectedVideoCount = videoSettings.filter((s) => s.isConnected).length;
  const connectedAudioCount = audioSettings.filter((s) => s.isConnected).length;

  const renderProviderList = (settings: APISetting[], emptyMessage: string) => {
    if (settings.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Plus className="w-10 h-10 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            Use the dropdown above to add AI services
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-3 pr-4">
        {settings.map((setting) => (
          <SettingRow
            key={setting.id}
            setting={setting}
            onUpdate={handleUpdateKey}
            onDelete={handleDelete}
            onRename={handleRename}
            isSaving={saveSettingMutation.isPending || updateSettingMutation.isPending}
            isDeleting={deleteSettingMutation.isPending}
          />
        ))}
      </div>
    );
  };

  return (
    <Dialog open={isSettingsOpen} onOpenChange={setSettingsOpen}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">Settings</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Configure your AI provider API keys for image and video generation
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg border">
          <Select value={selectedProvider} onValueChange={setSelectedProvider}>
            <SelectTrigger className="flex-1" data-testid="select-add-provider">
              <SelectValue placeholder="Add AI Service..." />
            </SelectTrigger>
            <SelectContent>
              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Free / No Key Required</div>
              {allProviders.filter((p) => p.isFree).map((provider) => (
                <SelectItem key={provider.id} value={provider.id}>
                  <span className="flex items-center gap-2">
                    {provider.name}
                    <Badge variant="secondary" className="text-[10px] bg-blue-500/10 text-blue-600">Free</Badge>
                  </span>
                </SelectItem>
              ))}
              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground border-t mt-1 pt-2">Image Generation</div>
              {imageProviders.filter((p) => !p.isFree).map((provider) => (
                <SelectItem key={provider.id} value={provider.id}>
                  {provider.name}
                </SelectItem>
              ))}
              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground border-t mt-1 pt-2">Video Generation</div>
              {videoProviders.map((provider) => (
                <SelectItem key={provider.id} value={provider.id}>
                  {provider.name}
                </SelectItem>
              ))}
              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground border-t mt-1 pt-2">Audio Generation</div>
              {audioProviders.map((provider) => (
                <SelectItem key={provider.id} value={provider.id}>
                  {provider.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button 
            onClick={handleAddProvider} 
            disabled={!selectedProvider || saveSettingMutation.isPending}
            data-testid="button-add-provider"
          >
            {saveSettingMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4 mr-1" />
            )}
            Add
          </Button>
        </div>

        <Tabs defaultValue="image-providers" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="image-providers" className="gap-1" data-testid="settings-tab-image-providers">
              <Image className="w-4 h-4" />
              Image
              {connectedImageCount > 0 && (
                <Badge variant="secondary" className="ml-1 bg-green-500/10 text-green-600 dark:text-green-400 text-xs">
                  {connectedImageCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="video-providers" className="gap-1" data-testid="settings-tab-video-providers">
              <Video className="w-4 h-4" />
              Video
              {connectedVideoCount > 0 && (
                <Badge variant="secondary" className="ml-1 bg-green-500/10 text-green-600 dark:text-green-400 text-xs">
                  {connectedVideoCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="audio-providers" className="gap-1" data-testid="settings-tab-audio-providers">
              <Volume2 className="w-4 h-4" />
              Audio
              {connectedAudioCount > 0 && (
                <Badge variant="secondary" className="ml-1 bg-green-500/10 text-green-600 dark:text-green-400 text-xs">
                  {connectedAudioCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="image-providers" className="flex-1 overflow-hidden mt-4">
            <ScrollArea className="h-[45vh]">
              {renderProviderList(imageSettings, "No image providers added yet")}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="video-providers" className="flex-1 overflow-hidden mt-4">
            <ScrollArea className="h-[45vh]">
              {renderProviderList(videoSettings, "No video providers added yet")}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="audio-providers" className="flex-1 overflow-hidden mt-4">
            <ScrollArea className="h-[45vh]">
              {renderProviderList(audioSettings, "No audio providers added yet")}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
