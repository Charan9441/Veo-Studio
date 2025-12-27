
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import {
  GoogleGenAI,
  Type,
  Video,
  VideoGenerationReferenceImage,
  VideoGenerationReferenceType,
} from '@google/genai';
import {GenerateVideoParams, GenerationMode, StoryboardScene} from '../types';

export const parseScript = async (script: string): Promise<StoryboardScene[]> => {
  const ai = new GoogleGenAI({apiKey: process.env.API_KEY});
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Analyze the following video script/brief and break it into 5 distinct cinematic scenes for an AI video generator. 
    Each scene should have a clear visual prompt that describes the camera angle, lighting, and action. 
    Ensure the prompts describe a consistent environment and character.
    
    Script:
    ${script}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            prompt: { type: Type.STRING },
          },
          required: ["title", "prompt"],
        }
      }
    }
  });

  try {
    const rawData = JSON.parse(response.text);
    return rawData.map((scene: any, index: number) => ({
      id: `scene-${index}`,
      title: scene.title,
      prompt: scene.prompt,
      videoUrl: null,
      videoObject: null,
      status: 'idle',
    }));
  } catch (e) {
    console.error("Failed to parse script JSON", e);
    throw new Error("Could not interpret the script. Please try a different description.");
  }
};

export const generateVideo = async (
  params: GenerateVideoParams,
): Promise<{objectUrl: string; blob: Blob; uri: string; video: Video}> => {
  const ai = new GoogleGenAI({apiKey: process.env.API_KEY});

  const config: any = {
    numberOfVideos: 1,
    resolution: params.resolution,
  };

  if (params.mode !== GenerationMode.EXTEND_VIDEO) {
    config.aspectRatio = params.aspectRatio;
  }

  const generateVideoPayload: any = {
    model: params.model,
    config: config,
  };

  if (params.prompt) {
    generateVideoPayload.prompt = params.prompt;
  }

  // Handle image-to-video or continuity frames
  if (params.startFrame) {
    generateVideoPayload.image = {
      imageBytes: params.startFrame.base64,
      mimeType: params.startFrame.file.type || 'image/png',
    };
  }

  if (params.mode === GenerationMode.FRAMES_TO_VIDEO) {
    const finalEndFrame = params.isLooping ? params.startFrame : params.endFrame;
    if (finalEndFrame) {
      generateVideoPayload.config.lastFrame = {
        imageBytes: finalEndFrame.base64,
        mimeType: finalEndFrame.file.type || 'image/png',
      };
    }
  } else if (params.mode === GenerationMode.REFERENCES_TO_VIDEO) {
    const referenceImagesPayload: VideoGenerationReferenceImage[] = [];
    if (params.referenceImages) {
      for (const img of params.referenceImages) {
        referenceImagesPayload.push({
          image: { imageBytes: img.base64, mimeType: img.file.type || 'image/png' },
          referenceType: VideoGenerationReferenceType.ASSET,
        });
      }
    }
    if (referenceImagesPayload.length > 0) {
      generateVideoPayload.config.referenceImages = referenceImagesPayload;
    }
  } else if (params.mode === GenerationMode.EXTEND_VIDEO) {
    if (params.inputVideoObject) {
      generateVideoPayload.video = params.inputVideoObject;
    } else {
      throw new Error('An input video object is required to extend a video.');
    }
  }

  let operation = await ai.models.generateVideos(generateVideoPayload);

  while (!operation.done) {
    await new Promise((resolve) => setTimeout(resolve, 10000));
    operation = await ai.operations.getVideosOperation({operation: operation});
  }

  if (operation?.response) {
    const videos = operation.response.generatedVideos;
    if (!videos || videos.length === 0) throw new Error('No videos were generated.');

    const firstVideo = videos[0];
    const videoObject = firstVideo.video;
    const url = decodeURIComponent(videoObject.uri);

    const res = await fetch(`${url}&key=${process.env.API_KEY}`);
    if (!res.ok) throw new Error(`Failed to fetch video: ${res.status}`);

    const videoBlob = await res.blob();
    const objectUrl = URL.createObjectURL(videoBlob);

    return {objectUrl, blob: videoBlob, uri: url, video: videoObject};
  } else {
    throw new Error('Operation failed.');
  }
};
