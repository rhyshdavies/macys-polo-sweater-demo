import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";

export const maxDuration = 120;

async function buildCompositeImage(
    items: Array<{ name: string; buffer: Buffer }>,
    cellWidth = 732,
    cellHeight = 935,
    cols = 2
): Promise<Buffer> {
    const rows = Math.ceil(items.length / cols);
    const padding = 16;
    const labelHeight = 48;
    const imgAreaHeight = cellHeight - labelHeight - padding * 2;
    const canvasWidth = cols * cellWidth;
    const canvasHeight = rows * cellHeight;

    const composites: sharp.OverlayOptions[] = [];

    for (let i = 0; i < items.length; i++) {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = col * cellWidth;
        const y = row * cellHeight;

        // Resize the product image to fit the cell, maintaining aspect ratio
        const resized = await sharp(items[i].buffer)
            .resize(cellWidth - padding * 2, imgAreaHeight, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 1 } })
            .png()
            .toBuffer();

        composites.push({
            input: resized,
            left: x + padding,
            top: y + padding,
        });

        // Create a text label as an SVG overlay
        const escapedName = items[i].name
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
        const labelSvg = Buffer.from(`
            <svg width="${cellWidth - padding * 2}" height="${labelHeight}">
                <rect width="100%" height="100%" fill="white"/>
                <text x="${(cellWidth - padding * 2) / 2}" y="${labelHeight / 2 + 6}"
                    font-family="Arial, Helvetica, sans-serif" font-size="20" font-weight="bold"
                    fill="#222" text-anchor="middle">${escapedName}</text>
            </svg>
        `);

        composites.push({
            input: labelSvg,
            left: x + padding,
            top: y + padding + imgAreaHeight,
        });
    }

    return sharp({
        create: {
            width: canvasWidth,
            height: canvasHeight,
            channels: 4,
            background: { r: 255, g: 255, b: 255, alpha: 1 },
        },
    })
        .composite(composites)
        .png()
        .toBuffer();
}

async function fetchWithRetry(url: string, maxRetries = 3): Promise<Response> {
    const headers: Record<string, string> = {};
    if (url.includes("macysassets.com") || url.includes("macys.com")) {
        headers["User-Agent"] = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36";
        headers["Accept"] = "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8";
        headers["Referer"] = "https://www.macys.com/";
    }

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 15000);
            const resp = await fetch(url, { headers, signal: controller.signal });
            clearTimeout(timeout);
            if (resp.ok) return resp;
        } catch (e) {
            if (attempt === maxRetries - 1) throw e;
            await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
        }
    }
    throw new Error(`Failed to fetch ${url} after ${maxRetries} retries`);
}

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const userImage = formData.get("userImage") as File;
        const garmentImage = formData.get("garmentImage") as string;
        const garmentName = formData.get("garmentName") as string;
        const colorName = formData.get("colorName") as string;
        const additionalGarmentsJson = formData.get("additionalGarments") as string;
        const resolution = (formData.get("resolution") as string) || "1K";

        if (!userImage) {
            return NextResponse.json({ error: "No user image provided" }, { status: 400 });
        }

        const apiKey = process.env.GOOGLE_AI_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: "API key not configured" }, { status: 500 });
        }

        const resolveUrl = (url: string): string => {
            if (url.startsWith("http://") || url.startsWith("https://")) return url;
            const origin = request.headers.get("origin") || request.headers.get("host");
            const protocol = request.headers.get("x-forwarded-proto") || "http";
            const baseUrl = origin?.startsWith("http") ? origin : `${protocol}://${origin}`;
            return new URL(url, baseUrl).toString();
        };

        const detectMime = (contentType: string | null): string => {
            const raw = (contentType || "image/jpeg").split(";")[0].trim();
            return ["image/png", "image/jpeg", "image/webp"].includes(raw) ? raw : "image/jpeg";
        };

        const isFootwear = (name: string) => /shoe|boot|heel|sandal|sneaker|loafer|mule|pump|slipper|clog/i.test(name);
        const isBottoms = (name: string) => /trouser|pant|chino|jean|jogger|short|skirt|legging|tight/i.test(name);
        const isBag = (name: string) => /bag|clutch|tote|purse|backpack|satchel/i.test(name);

        // Convert user image
        const userImageBuffer = await userImage.arrayBuffer();
        const userImageBase64 = Buffer.from(userImageBuffer).toString("base64");
        const userImageMimeType = userImage.type;

        // Fetch main garment image
        const garmentUrl = resolveUrl(garmentImage);
        const garmentResponse = await fetchWithRetry(garmentUrl);
        const garmentBuffer = await garmentResponse.arrayBuffer();
        const garmentImageBase64 = Buffer.from(garmentBuffer).toString("base64");
        const garmentMimeType = detectMime(garmentResponse.headers.get("content-type"));

        // Fetch additional garment images
        const additionalGarments: Array<{ name: string; image: string }> = additionalGarmentsJson
            ? JSON.parse(additionalGarmentsJson) : [];
        let requiresFullBody = false;

        const accessoryBuffers: Array<{ name: string; buffer: Buffer }> = [];

        for (const garment of additionalGarments) {
            const url = resolveUrl(garment.image);
            try {
                const resp = await fetchWithRetry(url);
                const buf = Buffer.from(await resp.arrayBuffer());
                accessoryBuffers.push({ name: garment.name, buffer: buf });
            } catch (e) {
                console.warn(`Skipping accessory ${garment.name}: failed to fetch image`);
                continue;
            }

            if (isFootwear(garment.name) || isBottoms(garment.name)) {
                requiresFullBody = true;
            }
        }

        const ai = new GoogleGenAI({ apiKey });
        const hasAccessories = accessoryBuffers.length > 0;

        // Build the accessory list for the prompt
        const accessoryList = additionalGarments.map((g) => {
            if (isFootwear(g.name)) return `- ${g.name} (FOOTWEAR — must be WORN ON FEET, match exact color)`;
            if (isBag(g.name)) return `- ${g.name} (BAG — held in hand or on arm)`;
            return `- ${g.name} (worn on body, match exact color)`;
        }).join("\n");

        // Build content parts: prompt, subject photo, main garment, and optionally one composite
        const contentParts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];

        let compositeSection = "";
        if (hasAccessories) {
            // Build a single composite image of all accessories
            const cols = accessoryBuffers.length <= 2 ? accessoryBuffers.length : 2;
            const compositeBuffer = await buildCompositeImage(accessoryBuffers, 732, 935, cols);
            const compositeBase64 = compositeBuffer.toString("base64");

            compositeSection = `
## ACCESSORIES (IMAGE 3 — COMPOSITE GRID)
IMAGE 3 is a labeled grid showing ALL accessories the subject must wear. Each cell contains:
- A product photo showing the EXACT item
- A text label with the item name

Items in the grid:
${accessoryList}

For EACH item in the grid:
1. The subject MUST wear/carry it exactly as shown
2. Match the EXACT color from the grid photo — do NOT substitute or approximate
3. Footwear MUST be worn on the feet and match the shoe color precisely
4. Bags should be held; all other items should be worn`;

            contentParts.push(
                {
                    text: `You are a photorealistic fashion image generator. Dress the person from IMAGE 1 in the complete outfit shown across the reference images.

## IMAGE MANIFEST
- IMAGE 1: THE SUBJECT — reproduce this exact person
- IMAGE 2: ${garmentName} in ${colorName} — MAIN GARMENT
- IMAGE 3: ACCESSORIES GRID — labeled composite of all additional items

## IDENTITY PRESERVATION (HIGHEST PRIORITY)
The person in IMAGE 1 is the subject. Your output MUST show this EXACT person:
- Same face, hair, body type, proportions, age, skin tone — pixel-for-pixel
- Do NOT substitute a different person under any circumstances

## MAIN GARMENT (IMAGE 2)
${garmentName} in ${colorName}
- Reproduce the exact design, cut, pattern, and color from IMAGE 2
- Do not alter, recolor, or approximate
${compositeSection}

## COLOR ACCURACY (MANDATORY)
For EVERY item in the output:
1. Look at the corresponding reference photo
2. Reproduce that EXACT color — same hue, saturation, brightness
3. Do NOT substitute similar colors or default to generic black/brown/grey
4. This is especially critical for footwear — the shoe color must match the grid photo exactly

## COMPOSITION
- Scene: tree-lined city street, elegant buildings, blue sky, warm afternoon light
- Pose: natural walking pose, mid-stride towards camera
- Style: lifestyle fashion photography, editorial quality
- Framing: ${requiresFullBody ? "FULL BODY from head to toe — feet and shoes MUST be fully visible" : "full body shot showing complete outfit head to toe"}

## OUTPUT
- Portrait orientation (3:4 aspect ratio)
- 4K quality
- All garments and accessories clearly visible
${requiresFullBody ? "- The complete lower body including footwear MUST be in frame" : ""}`
                },
                { text: "IMAGE 1 — THE SUBJECT (reproduce this person exactly):" },
                { inlineData: { mimeType: userImageMimeType, data: userImageBase64 } },
                { text: `IMAGE 2 — ${garmentName} in ${colorName} (MAIN GARMENT — match this color and design):` },
                { inlineData: { mimeType: garmentMimeType, data: garmentImageBase64 } },
                { text: "IMAGE 3 — ACCESSORIES GRID (each cell is labeled — the subject must wear ALL items shown, matching each item's exact color):" },
                { inlineData: { mimeType: "image/png", data: compositeBase64 } },
            );
        } else {
            // No accessories — just subject + main garment
            contentParts.push(
                {
                    text: `You are a photorealistic fashion image generator. Dress the person from IMAGE 1 in the garment from IMAGE 2.

## IMAGE MANIFEST
- IMAGE 1: THE SUBJECT — reproduce this exact person
- IMAGE 2: ${garmentName} in ${colorName} — MAIN GARMENT

## IDENTITY PRESERVATION (HIGHEST PRIORITY)
The person in IMAGE 1 is the subject. Your output MUST show this EXACT person:
- Same face, hair, body type, proportions, age, skin tone — pixel-for-pixel
- Do NOT substitute a different person under any circumstances

## MAIN GARMENT (IMAGE 2)
${garmentName} in ${colorName}
- Reproduce the exact design, cut, pattern, and color from IMAGE 2
- Do not alter, recolor, or approximate

## COLOR ACCURACY (MANDATORY)
Reproduce the EXACT color from IMAGE 2 — same hue, saturation, brightness.

## COMPOSITION
- Scene: tree-lined city street, elegant buildings, blue sky, warm afternoon light
- Pose: natural walking pose, mid-stride towards camera
- Style: lifestyle fashion photography, editorial quality
- Framing: full body shot showing complete outfit head to toe

## OUTPUT
- Portrait orientation (3:4 aspect ratio)
- 4K quality` },
                { text: "IMAGE 1 — THE SUBJECT (reproduce this person exactly):" },
                { inlineData: { mimeType: userImageMimeType, data: userImageBase64 } },
                { text: `IMAGE 2 — ${garmentName} in ${colorName} (MAIN GARMENT — match this color and design):` },
                { inlineData: { mimeType: garmentMimeType, data: garmentImageBase64 } },
            );
        }

        const response = await ai.models.generateContent({
            model: "gemini-3.1-flash-image-preview",
            contents: [{ role: "user", parts: contentParts }],
            config: { responseModalities: ["TEXT", "IMAGE"] },
        });

        const parts = response.candidates?.[0]?.content?.parts;
        if (!parts) {
            return NextResponse.json({ error: "No response from AI model" }, { status: 500 });
        }

        let generatedImageBase64 = null;
        let responseText = null;

        for (const part of parts) {
            if (part.text) responseText = part.text;
            if (part.inlineData) generatedImageBase64 = part.inlineData.data;
        }

        if (!generatedImageBase64) {
            return NextResponse.json({
                error: "Failed to generate image",
                message: responseText || "The AI model did not return an image."
            }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            image: `data:image/png;base64,${generatedImageBase64}`,
            message: responseText,
        });
    } catch (error) {
        console.error("Try-on error:", error);
        const errorString = String(error);

        if (errorString.includes("503") || errorString.includes("overloaded")) {
            return NextResponse.json({ error: "AI model is overloaded. Please try again.", details: errorString }, { status: 503 });
        }

        return NextResponse.json({ error: "Failed to process try-on request", details: errorString }, { status: 500 });
    }
}
