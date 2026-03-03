import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 300;

export async function POST(request: NextRequest) {
    try {
        const { image } = await request.json();

        if (!image) {
            return NextResponse.json({ error: "No image provided" }, { status: 400 });
        }

        const apiKey = process.env.GOOGLE_AI_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: "API key not configured" }, { status: 500 });
        }

        const ai = new GoogleGenAI({ apiKey });

        const tryOnMatches = image.match(/^data:(.+);base64,(.+)$/);
        if (!tryOnMatches) {
            return NextResponse.json({ error: "Invalid image format" }, { status: 400 });
        }

        let operation = await ai.models.generateVideos({
            model: "veo-3.1-fast-generate-preview",
            prompt: `
                CRITICAL: This is the STARTING FRAME. Keep this EXACT person, face, and outfit throughout the entire video.
                
                SCENE: Walking down a beautiful city street on a sunny day.
                - Urban backdrop - elegant buildings, tree-lined sidewalk, blue sky
                - Natural sunlight, warm afternoon lighting
                - Slight depth of field blur on background to focus on the person
                
                IDENTITY PRESERVATION (MANDATORY):
                - The person's face must be 100% identical to this starting frame in EVERY video frame
                - Same facial features, same expression, same hair
                - Keep the EXACT same clothing and outfit visible in this image
                - NO morphing into a different person
                
                MOTION:
                - Confident walking motion - natural steps forward on the sidewalk
                - Arms swing naturally with walking
                - Clothing fabric moves subtly with the walking motion
                - Occasional glance at camera, natural and relaxed expression
                - Walking towards camera
                
                CAMERA: Smooth tracking shot following the person. Cinematic movement.
                
                This should look like a lifestyle fashion video - a stylish person walking through the city.
                
                Audio: Ambient city sounds - birds, light traffic, footsteps on pavement. NO music, NO speech.
            `.trim(),
            image: {
                imageBytes: tryOnMatches[2],
                mimeType: tryOnMatches[1]
            },
            config: {
                personGeneration: "allow_adult",
                aspectRatio: "9:16",
                numberOfSeconds: 4,
            }
        });

        console.log("Video generation started:", operation.name);

        while (!operation.done) {
            console.log("Polling video status...");
            await new Promise(resolve => setTimeout(resolve, 10000));
            operation = await ai.operations.getVideosOperation({ operation: operation });
        }

        console.log("Video generation complete!");

        const videoFile = operation.response?.generatedVideos?.[0]?.video;
        if (!videoFile) {
            throw new Error("No video returned from generation");
        }

        if (videoFile.videoBytes) {
            return NextResponse.json({
                success: true,
                video: `data:${videoFile.mimeType || 'video/mp4'};base64,${videoFile.videoBytes}`,
            });
        }

        if (videoFile.uri) {
            const urlWithKey = videoFile.uri.includes('?')
                ? `${videoFile.uri}&key=${apiKey}`
                : `${videoFile.uri}?key=${apiKey}`;

            const videoResponse = await fetch(urlWithKey);
            if (!videoResponse.ok) {
                throw new Error(`Failed to fetch video: ${videoResponse.status}`);
            }
            const arrayBuffer = await videoResponse.arrayBuffer();
            const videoBase64 = Buffer.from(arrayBuffer).toString("base64");

            return NextResponse.json({
                success: true,
                video: `data:${videoFile.mimeType || 'video/mp4'};base64,${videoBase64}`,
            });
        }

        throw new Error("Video has no bytes or URI available");

    } catch (error) {
        console.error("Video generation error:", error);
        return NextResponse.json({ error: "Failed to generate video", details: String(error) }, { status: 500 });
    }
}
