
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState } from 'react';
import { StoryboardScene, VeoModel, AspectRatio, Resolution, GenerationMode } from '../types';
import { generateVideo } from '../services/geminiService';
import { SparklesIcon, ArrowPathIcon, PlusIcon } from './icons';

interface DirectorViewProps {
  scenes: StoryboardScene[];
  onNewProject: () => void;
  aspectRatio: AspectRatio;
  resolution: Resolution;
  model: VeoModel;
}

const DirectorView: React.FC<DirectorViewProps> = ({ 
  scenes: initialScenes, 
  onNewProject,
  aspectRatio,
  resolution,
  model
}) => {
  const [scenes, setScenes] = useState<StoryboardScene[]>(initialScenes);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const handleGenerateScene = async (index: number) => {
    const scene = scenes[index];
    const prevScene = index > 0 ? scenes[index - 1] : null;

    setScenes(prev => prev.map((s, i) => i === index ? { ...s, status: 'generating' } : s));
    setGlobalError(null);

    try {
      // Logic for continuity: if previous scene is done, fetch its last frame
      let startFrame = null;
      if (prevScene && prevScene.videoObject) {
         // In a real app we might extract the last frame from the video blob
         // For now we assume the AI handles descriptive continuity well, 
         // but ideally we'd pass a frame here.
      }

      const result = await generateVideo({
        prompt: scene.prompt,
        model,
        aspectRatio,
        resolution,
        mode: GenerationMode.TEXT_TO_VIDEO,
        // startFrame: startFrame // Optional: pass base64 from previous video capture
      });

      setScenes(prev => prev.map((s, i) => i === index ? { 
        ...s, 
        status: 'done', 
        videoUrl: result.objectUrl,
        videoObject: result.video
      } : s));

    } catch (err) {
      console.error(err);
      setGlobalError(`Failed to generate Scene ${index + 1}`);
      setScenes(prev => prev.map((s, i) => i === index ? { ...s, status: 'error' } : s));
    }
  };

  return (
    <div className="w-full flex flex-col gap-6 py-6 overflow-y-auto max-h-[80vh] px-2 custom-scrollbar">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Project Storyboard</h2>
          <p className="text-gray-400 text-sm">Each scene follows the previous for visual continuity.</p>
        </div>
        <button 
          onClick={onNewProject}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm flex items-center gap-2"
        >
          <PlusIcon className="w-4 h-4" /> New Project
        </button>
      </div>

      {globalError && (
        <div className="bg-red-900/20 border border-red-500/50 p-4 rounded-lg text-red-400 text-sm">
          {globalError}
        </div>
      )}

      <div className="space-y-6">
        {scenes.map((scene, idx) => (
          <div key={scene.id} className={`p-4 rounded-xl border transition-all ${
            scene.status === 'generating' ? 'border-indigo-500 bg-indigo-500/5 animate-pulse' : 'border-gray-700 bg-gray-800/40'
          }`}>
            <div className="flex gap-6">
              <div className="flex-grow">
                <div className="flex items-center gap-3 mb-2">
                  <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">
                    {idx + 1}
                  </span>
                  <h3 className="font-semibold text-lg text-gray-100">{scene.title}</h3>
                </div>
                <p className="text-gray-400 text-sm italic mb-4">"{scene.prompt}"</p>
                
                {scene.status === 'idle' && (
                  <button 
                    onClick={() => handleGenerateScene(idx)}
                    className="flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-all"
                  >
                    <SparklesIcon className="w-4 h-4" />
                    Produce Scene {idx + 1}
                  </button>
                )}

                {scene.status === 'generating' && (
                  <div className="flex items-center gap-2 text-indigo-400 text-sm font-medium">
                    <div className="w-4 h-4 border-2 border-t-transparent border-indigo-400 rounded-full animate-spin"></div>
                    Directing Scene...
                  </div>
                )}

                {scene.status === 'error' && (
                  <button 
                    onClick={() => handleGenerateScene(idx)}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/50 rounded-lg text-sm"
                  >
                    <ArrowPathIcon className="w-4 h-4" /> Retry
                  </button>
                )}
              </div>

              <div className="w-64 h-36 bg-black rounded-lg overflow-hidden border border-gray-700 shrink-0 shadow-inner flex items-center justify-center text-gray-600">
                {scene.videoUrl ? (
                  <video src={scene.videoUrl} controls className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs uppercase tracking-widest font-bold">No Footage</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DirectorView;
