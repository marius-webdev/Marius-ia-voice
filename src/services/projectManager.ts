import { SavedProject, GenerationSegment } from '../types.ts';

const PROJECTS_STORAGE_KEY = 'marius_projects_library';

export const projectManager = {
  getProjects(): SavedProject[] {
    try {
      const raw = localStorage.getItem(PROJECTS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to load projects from localStorage:', e);
    }
    return [];
  },

  getProject(id: string): SavedProject | null {
    const projects = this.getProjects();
    return projects.find((p) => p.id === id) || null;
  },

  saveProject(project: SavedProject): SavedProject {
    const projects = this.getProjects();
    const existingIndex = projects.findIndex((p) => p.id === project.id);
    const updated: SavedProject = {
      ...project,
      updatedAt: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      projects[existingIndex] = updated;
    } else {
      projects.unshift(updated);
    }

    try {
      localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(projects));
    } catch (e) {
      console.warn('Storage quota exceeded when saving project:', e);
      // If audioWavBase64 caused quota error, save metadata without heavy base64
      try {
        const lightweight = projects.map((p) =>
          p.id === project.id
            ? { ...p, audioWavBase64: undefined }
            : p
        );
        localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(lightweight));
      } catch {}
    }

    return updated;
  },

  createProject(data: {
    name?: string;
    text?: string;
    voiceName?: string;
    customVoiceId?: string | null;
    speed?: number;
    pitch?: 'deep' | 'normal' | 'high';
    style?: string;
    presetId?: string;
    segments?: GenerationSegment[];
  }): SavedProject {
    const id = `proj_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const newProject: SavedProject = {
      id,
      name: data.name?.trim() || `Projet Vocal du ${new Date().toLocaleDateString('fr-FR')}`,
      text: data.text || '',
      voiceName: data.voiceName || 'Kore',
      customVoiceId: data.customVoiceId || null,
      speed: data.speed ?? 1.0,
      pitch: data.pitch || 'normal',
      style: data.style || '',
      presetId: data.presetId || 'commercial',
      createdAt: now,
      updatedAt: now,
      segments: data.segments || [],
    };

    return this.saveProject(newProject);
  },

  deleteProject(id: string): boolean {
    const projects = this.getProjects();
    const filtered = projects.filter((p) => p.id !== id);
    try {
      localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(filtered));
      return true;
    } catch (e) {
      console.error('Failed to delete project:', e);
      return false;
    }
  },
};
