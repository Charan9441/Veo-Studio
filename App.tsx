
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import {Video} from '@google/genai';
import React, {useCallback, useEffect, useState} from 'react';
import ApiKeyDialog from './components/ApiKeyDialog';
import {CurvedArrowDownIcon} from './components/icons';
import LoadingIndicator from './components/LoadingIndicator';
import PromptForm from './components/PromptForm';
import VideoResult from './components/VideoResult';
import DirectorView from './components/DirectorView';
import {generateVideo} from './services/geminiService';
import {
  AppState,
  GenerateVideoParams,
  GenerationMode,
  Resolution,
  VideoFile,
  StoryboardScene,
  AspectRatio,
  VeoModel,
} from './types';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastConfig, setLastConfig] = useState<GenerateVideoParams | null>(null);
  const [lastVideoObject, setLastVideoObject] = useState<Video | null>(null);
  const [lastVideoBlob, setLastVideoBlob] = useState<Blob | null>(null);
  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false);
  
  // Director State
  const [storyboardScenes, setStoryboardScenes] = useState<StoryboardScene[]>([]);

  const [initialFormValues, setInitialFormValues] = useState<GenerateVideoParams | null>(null);

  useEffect(() => {
    const checkApiKey = async () => {
      if (window.aistudio) {
        try {
          if (!(await window.aistudio.hasSelectedApiKey())) setShowApiKeyDialog(true);
        } catch { setShowApiKeyDialog(true); }
      }
    };
    checkApiKey();
  }, []);

  const handleGenerate = useCallback(async (params: GenerateVideoParams) => {
    setAppState(AppState.LOADING);
    setErrorMessage(null);
    setLastConfig(params);

    try {
      const {objectUrl, blob, video} = await generateVideo(params);
      setVideoUrl(objectUrl);
      setLastVideoBlob(blob);
      setLastVideoObject(video);
      setAppState(AppState.SUCCESS);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unknown error');
      setAppState(AppState.ERROR);
    }
  }, []);

  const handleDirectorParse = (scenes: StoryboardScene[]) => {
    setStoryboardScenes(scenes);
    setAppState(AppState.DIRECTOR_READY);
  };

  const handleNewVideo = useCallback(() => {
    setAppState(AppState.IDLE);
    setVideoUrl(null);
    setStoryboardScenes([]);
    setInitialFormValues(null);
  }, []);

  return (
    <div className="h-screen bg-black text-gray-200 flex flex-col font-sans overflow-hidden bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-black to-black">
      {showApiKeyDialog && <ApiKeyDialog onContinue={() => setShowApiKeyDialog(false)} />}
      <header className="py-6 flex justify-center items-center px-8 relative z-10">
        <h1 className="text-5xl font-semibold tracking-tighter text-center bg-gradient-to-r from-indigo-400 via-purple-500 to-pink-500 bg-clip-text text-transparent">
          Veo Studio
        </h1>
      </header>
      <main className="w-full max-w-5xl mx-auto flex-grow flex flex-col p-4">
        {appState === AppState.IDLE ? (
          <>
            <div className="flex-grow flex items-center justify-center">
              <div className="relative text-center">
                <h2 className="text-3xl font-light text-gray-400">
                  What story will you tell today?
                </h2>
                <CurvedArrowDownIcon className="absolute top-full left-1/2 -translate-x-1/2 mt-4 w-12 h-12 text-gray-700 opacity-40" />
              </div>
            </div>
            <div className="pb-8">
              <PromptForm 
                onGenerate={handleGenerate} 
                onDirectorParse={handleDirectorParse}
                initialValues={initialFormValues} 
              />
            </div>
          </>
        ) : (
          <div className="flex-grow flex items-center justify-center overflow-hidden">
            {appState === AppState.LOADING && <LoadingIndicator />}
            
            {appState === AppState.DIRECTOR_READY && (
              <DirectorView 
                scenes={storyboardScenes} 
                onNewProject={handleNewVideo}
                aspectRatio={lastConfig?.aspectRatio || AspectRatio.LANDSCAPE}
                resolution={lastConfig?.resolution || Resolution.P720}
                model={lastConfig?.model || VeoModel.VEO_FAST}
              />
            )}

            {appState === AppState.SUCCESS && videoUrl && (
              <VideoResult
                videoUrl={videoUrl}
                onRetry={() => handleGenerate(lastConfig!)}
                onNewVideo={handleNewVideo}
                onExtend={() => {}}
                canExtend={lastConfig?.resolution === Resolution.P720}
              />
            )}

            {appState === AppState.ERROR && (
              <div className="text-center p-8 border border-red-500/30 bg-red-900/10 rounded-2xl">
                <h2 className="text-2xl font-bold text-red-400 mb-2">Cut! Something went wrong.</h2>
                <p className="text-red-300/70 mb-6">{errorMessage}</p>
                <button onClick={handleNewVideo} className="px-6 py-2 bg-indigo-600 rounded-lg">Try Again</button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
