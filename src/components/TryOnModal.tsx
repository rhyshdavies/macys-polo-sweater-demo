"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { X, Upload, Camera, Loader2, Download, RefreshCw, Check, ChevronLeft, ChevronRight, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Color {
    id: string;
    name: string;
    hex: string;
    images: string[];
}

interface OutfitItem {
    id: string;
    name: string;
    image: string;
    category: string;
}

interface OutfitCategory {
    id: string;
    label: string;
    products: OutfitItem[];
}

const HorizontalScroll = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => {
    const scrollRef = useRef<HTMLDivElement>(null);

    const scroll = (direction: 'left' | 'right') => {
        if (scrollRef.current) {
            const { scrollLeft, clientWidth } = scrollRef.current;
            const scrollAmount = clientWidth * 0.8;
            scrollRef.current.scrollTo({
                left: direction === 'left' ? scrollLeft - scrollAmount : scrollLeft + scrollAmount,
                behavior: 'smooth'
            });
        }
    };

    return (
        <div className="relative group/scroll">
            <div
                ref={scrollRef}
                className={`flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide ${className}`}
            >
                {children}
            </div>
            <button
                onClick={(e) => { e.stopPropagation(); scroll('left'); }}
                className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 w-8 h-8 bg-white/90 shadow-lg rounded-full flex items-center justify-center border border-gray-200 opacity-0 group-hover/scroll:opacity-100 transition-opacity z-10 hover:bg-white"
            >
                <ChevronLeft className="w-5 h-5" />
            </button>
            <button
                onClick={(e) => { e.stopPropagation(); scroll('right'); }}
                className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 w-8 h-8 bg-white/90 shadow-lg rounded-full flex items-center justify-center border border-gray-200 opacity-0 group-hover/scroll:opacity-100 transition-opacity z-10 hover:bg-white"
            >
                <ChevronRight className="w-5 h-5" />
            </button>
        </div>
    );
};

interface TryOnModalProps {
    isOpen: boolean;
    onClose: () => void;
    garmentName: string;
    initialColor: Color;
    colors: Color[];
    outfitCategories: OutfitCategory[];
    brandPrimaryColor?: string;
}

export function TryOnModal({
    isOpen,
    onClose,
    garmentName,
    initialColor,
    colors,
    outfitCategories,
    brandPrimaryColor = "#000000",
}: TryOnModalProps) {
    const [userImage, setUserImage] = useState<File | null>(null);
    const [userImagePreview, setUserImagePreview] = useState<string | null>(null);
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isVideoLoading, setIsVideoLoading] = useState(false);
    const [isConverting, setIsConverting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [selectedItems, setSelectedItems] = useState<string[]>([]);
    const [activeColor, setActiveColor] = useState<Color>(initialColor);
    const [resolution, setResolution] = useState("1K");
    const [timer, setTimer] = useState(0);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const modalRef = useRef<HTMLDivElement>(null);
    const videoRef = useRef<HTMLDivElement>(null);

    const allOutfitItems = outfitCategories.flatMap(cat => 
        cat.products.map(p => ({ ...p, category: p.category || cat.id }))
    );

    useEffect(() => {
        if (generatedImage && modalRef.current) {
            modalRef.current.scrollTo({ top: 0, behavior: "smooth" });
        }
    }, [generatedImage]);

    useEffect(() => {
        if (videoUrl && videoRef.current) {
            videoRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    }, [videoUrl]);

    useEffect(() => {
        if (isOpen) setActiveColor(initialColor);
    }, [isOpen, initialColor]);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isLoading) {
            const duration = resolution === "1K" ? 20 : resolution === "2K" ? 30 : 45;
            setTimer(duration);
            interval = setInterval(() => setTimer((prev) => (prev > 0 ? prev - 1 : 0)), 1000);
        } else if (isVideoLoading) {
            setTimer(60);
            interval = setInterval(() => setTimer((prev) => (prev > 0 ? prev - 1 : 0)), 1000);
        } else {
            setTimer(0);
        }
        return () => clearInterval(interval);
    }, [isLoading, isVideoLoading, resolution]);

    const handleFileSelect = async (file: File) => {
        const isHeic = file.type === "image/heic" || file.type === "image/heif" ||
            file.name.toLowerCase().endsWith(".heic") || file.name.toLowerCase().endsWith(".heif");

        if (!file.type.startsWith("image/") && !isHeic) {
            setError("Please select an image file");
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            setError("Image must be less than 10MB");
            return;
        }

        setError(null);
        setGeneratedImage(null);

        if (isHeic) {
            try {
                setIsConverting(true);
                const heic2any = (await import("heic2any")).default;
                const convertedBlob = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.9 });
                const blob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
                const convertedFile = new File([blob], file.name.replace(/\.heic$/i, ".jpg"), { type: "image/jpeg" });
                setUserImage(convertedFile);
                setIsConverting(false);
                const reader = new FileReader();
                reader.onload = (e) => setUserImagePreview(e.target?.result as string);
                reader.readAsDataURL(convertedFile);
            } catch (err) {
                console.error("HEIC conversion error:", err);
                setError("Failed to convert HEIC image.");
                setIsConverting(false);
            }
            return;
        }

        setUserImage(file);
        const reader = new FileReader();
        reader.onload = (e) => setUserImagePreview(e.target?.result as string);
        reader.readAsDataURL(file);
    };

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFileSelect(file);
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); }, []);
    const handleDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); }, []);
    const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleFileSelect(file);
    };

    const toggleItem = (itemId: string) => {
        const item = allOutfitItems.find((opt) => opt.id === itemId);
        if (!item) return;
        setSelectedItems((prev) => {
            if (prev.includes(itemId)) return prev.filter((id) => id !== itemId);
            const categoryItemIds = allOutfitItems.filter((opt) => opt.category === item.category).map((opt) => opt.id);
            return [...prev.filter((id) => !categoryItemIds.includes(id)), itemId];
        });
    };

    const handleTryOn = async () => {
        if (!userImage) return;
        setIsLoading(true);
        setVideoUrl(null);
        setError(null);
        try {
            const formData = new FormData();
            formData.append("userImage", userImage);
            formData.append("garmentImage", activeColor?.images?.[0] || "");
            formData.append("garmentName", garmentName);
            formData.append("colorName", activeColor?.name || "");
            formData.append("resolution", resolution);
            const additionalGarments = selectedItems.map(id => {
                const item = allOutfitItems.find(opt => opt.id === id);
                return item ? { name: item.name, image: item.image } : null;
            }).filter(Boolean);
            formData.append("additionalGarments", JSON.stringify(additionalGarments));

            const response = await fetch("/api/try-on", { method: "POST", body: formData });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "Failed to generate image");
            setGeneratedImage(data.image);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Something went wrong");
        } finally {
            setIsLoading(false);
        }
    };

    const handleGenerateVideo = async () => {
        if (!generatedImage) return;
        setIsVideoLoading(true);
        setError(null);
        try {
            const response = await fetch("/api/try-on/video", {
                method: "POST",
                body: JSON.stringify({ image: generatedImage }),
                headers: { "Content-Type": "application/json" },
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "Failed to generate video");
            setVideoUrl(data.video);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Video generation failed");
        } finally {
            setIsVideoLoading(false);
        }
    };

    const handleDownload = () => {
        if (!generatedImage) return;
        const link = document.createElement("a");
        link.href = generatedImage;
        link.download = `${garmentName.toLowerCase().replace(/\s+/g, "-")}-tryon.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleReset = () => {
        setUserImage(null);
        setUserImagePreview(null);
        setGeneratedImage(null);
        setVideoUrl(null);
        setError(null);
        setSelectedItems([]);
    };

    const handleClose = () => { handleReset(); onClose(); };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />
            <div ref={modalRef} className="relative bg-white w-full max-w-6xl max-h-[95vh] overflow-y-auto mx-4 rounded-lg shadow-2xl">
                {/* Header */}
                <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
                    <div>
                        <h2 className="text-2xl font-bold" style={{ color: brandPrimaryColor }}>Virtual Try-On</h2>
                        <p className="text-sm text-gray-500">See how the {activeColor?.name} {garmentName} looks on you</p>
                    </div>
                    <button onClick={handleClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-6">
                    {!generatedImage ? (
                        <div className="grid lg:grid-cols-12 gap-8">
                            {/* Upload Section */}
                            <div className="lg:col-span-4 space-y-6">
                                <h3 className="text-lg font-bold mb-4" style={{ color: brandPrimaryColor }}>1. Upload Your Photo</h3>
                                <div
                                    onDrop={handleDrop}
                                    onDragOver={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                    className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-all cursor-pointer aspect-[3/4] flex flex-col items-center justify-center ${isDragging ? "border-gray-800 bg-gray-50" : userImagePreview ? "border-green-500 bg-green-50" : "border-gray-300 hover:border-gray-400"}`}
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <input ref={fileInputRef} type="file" accept="image/*,.heic,.heif" onChange={handleFileInputChange} className="hidden" />
                                    {isConverting ? (
                                        <div className="space-y-4">
                                            <Loader2 className="w-12 h-12 mx-auto animate-spin text-gray-400" />
                                            <p className="text-lg font-medium">Converting HEIC image...</p>
                                        </div>
                                    ) : userImagePreview ? (
                                        <div className="w-full h-full relative group">
                                            <img src={userImagePreview} alt="Your photo" className="w-full h-full object-cover rounded-lg" />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                                                <p className="text-white font-medium">Click to change photo</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center">
                                                <Upload className="w-8 h-8 text-gray-400" />
                                            </div>
                                            <p className="text-lg font-medium">Drag & drop your photo</p>
                                            <p className="text-sm text-gray-500">or click to browse</p>
                                            <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
                                                <Camera className="w-4 h-4" />
                                                <span>JPG, PNG, WEBP, HEIC up to 10MB</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Outfit Section */}
                            <div className="lg:col-span-8 space-y-8">
                                <h3 className="text-lg font-bold mb-4" style={{ color: brandPrimaryColor }}>2. Your Outfit</h3>
                                
                                {/* Selected Garment */}
                                <div className="flex items-center gap-6 p-4 bg-gray-50 rounded-lg mb-6">
                                    <img src={activeColor?.images?.[0] || ""} alt={garmentName} className="w-24 h-24 object-contain bg-white rounded-md p-2" />
                                    <div className="flex-1">
                                        <p className="font-bold text-lg">{garmentName}</p>
                                        <p className="text-sm text-gray-500">{activeColor?.name}</p>
                                        <div className="flex gap-2 mt-2">
                                            {colors.map((color) => (
                                                <button
                                                    key={color.id}
                                                    onClick={() => setActiveColor(color)}
                                                    className={`w-8 h-8 rounded-full transition-all ${activeColor?.id === color.id ? "ring-2 ring-offset-2 scale-110" : "hover:scale-105 ring-1 ring-gray-200"}`}
                                                    style={{ backgroundColor: color.hex, ringColor: activeColor?.id === color.id ? brandPrimaryColor : undefined }}
                                                    title={color.name}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Outfit Builder */}
                                {outfitCategories.length > 0 && (
                                    <div className="space-y-8">
                                        <h4 className="text-base font-bold uppercase tracking-wider border-b pb-2" style={{ color: brandPrimaryColor }}>Complete the Look</h4>
                                        {outfitCategories.map((category) => (
                                            <div key={category.id} className="space-y-4">
                                                <h5 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">{category.label}</h5>
                                                <HorizontalScroll>
                                                    {category.products.map((item) => (
                                                        <div
                                                            key={item.id}
                                                            onClick={() => toggleItem(item.id)}
                                                            className={`relative flex-shrink-0 w-44 snap-start p-3 border rounded-xl cursor-pointer transition-all flex flex-col items-center ${selectedItems.includes(item.id) ? "border-gray-800 bg-gray-50 ring-1 ring-gray-800" : "border-gray-200 hover:border-gray-300"}`}
                                                        >
                                                            <div className="w-full h-32 bg-white rounded-lg p-2 flex items-center justify-center">
                                                                <img src={item.image} alt={item.name} className="w-full h-full object-contain" />
                                                            </div>
                                                            <p className="text-xs font-medium text-center line-clamp-2 mt-2 px-1">{item.name}</p>
                                                            {selectedItems.includes(item.id) && (
                                                                <div className="absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center shadow-sm" style={{ backgroundColor: brandPrimaryColor }}>
                                                                    <Check className="w-3.5 h-3.5 text-white" />
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </HorizontalScroll>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {error && <div className="p-4 bg-red-50 border border-red-200 rounded-lg"><p className="text-sm text-red-600">{error}</p></div>}

                                {/* Resolution & Generate */}
                                <div className="space-y-2">
                                    <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Image Quality</span>
                                    <div className="flex bg-gray-100 p-1 rounded-lg">
                                        {[{ val: "1K", label: "1K (~20s)" }, { val: "2K", label: "2K (~30s)" }, { val: "4K", label: "4K (~45s)" }].map((opt) => (
                                            <button key={opt.val} onClick={() => setResolution(opt.val)} className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${resolution === opt.val ? "bg-white text-black shadow-sm" : "text-gray-500 hover:text-black"}`}>
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="pt-4 border-t">
                                    <Button onClick={handleTryOn} disabled={!userImage || isLoading} className="w-full h-14 text-lg font-bold text-white rounded-none uppercase tracking-widest" style={{ backgroundColor: brandPrimaryColor }}>
                                        {isLoading ? <><Loader2 className="w-5 h-5 animate-spin mr-2" />Generating...</> : "Generate Try-On"}
                                    </Button>
                                    {isLoading && (
                                        <div className="mt-2 text-center">
                                            <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                                                <div className="h-full transition-all duration-1000" style={{ backgroundColor: brandPrimaryColor, width: `${((resolution === "1K" ? 20 : resolution === "2K" ? 30 : 45) - timer) / (resolution === "1K" ? 20 : resolution === "2K" ? 30 : 45) * 100}%` }} />
                                            </div>
                                            <p className="text-sm text-gray-500 mt-1">Estimated time: {timer}s</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* Results */
                        <div className="space-y-8">
                            <div className="text-center">
                                <h3 className="text-2xl font-bold mb-2" style={{ color: brandPrimaryColor }}>Your Virtual Try-On Result</h3>
                                <p className="text-gray-500">Featuring: {garmentName} ({activeColor?.name})</p>
                                {!videoUrl && !isVideoLoading && (
                                    <Button onClick={handleGenerateVideo} className="mt-4 h-12 px-8 text-white rounded-none uppercase" style={{ backgroundColor: brandPrimaryColor }}>
                                        <Camera className="w-4 h-4 mr-2" />Generate Video (~60s)
                                    </Button>
                                )}
                                {isVideoLoading && (
                                    <div className="mt-4"><Loader2 className="w-6 h-6 animate-spin mx-auto" /><p className="text-sm text-gray-500 mt-2">Generating video... {timer}s</p></div>
                                )}
                            </div>

                            <div className="grid md:grid-cols-2 gap-8">
                                {/* Outfit Selected - Show product images */}
                                <div className="space-y-3">
                                    <p className="text-sm font-bold uppercase text-gray-500 text-center">Outfit Selected</p>
                                    <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                                        {/* Main Garment */}
                                        <div className="flex items-center gap-4 bg-white rounded-lg p-3 border border-gray-100">
                                            <div className="w-20 h-24 bg-gray-100 rounded-md overflow-hidden flex-shrink-0">
                                                <img src={activeColor?.images?.[0]} alt={garmentName} className="w-full h-full object-cover" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-semibold text-sm truncate">{garmentName}</p>
                                                <p className="text-xs text-gray-500">{activeColor?.name}</p>
                                                <span className="inline-block mt-1 px-2 py-0.5 bg-gray-100 text-xs rounded">Main Item</span>
                                            </div>
                                        </div>
                                        {/* Selected Accessories */}
                                        {selectedItems.length > 0 && (
                                            <div className="space-y-2">
                                                <p className="text-xs font-medium text-gray-400 uppercase">+ Accessories</p>
                                                {allOutfitItems.filter(item => selectedItems.includes(item.id)).map((item) => (
                                                    <div key={item.id} className="flex items-center gap-3 bg-white rounded-lg p-2 border border-gray-100">
                                                        <div className="w-14 h-16 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                                                            <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-medium text-sm truncate">{item.name}</p>
                                                            <p className="text-xs text-gray-400 capitalize">{item.category}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        {selectedItems.length === 0 && (
                                            <p className="text-xs text-gray-400 text-center italic">No accessories selected</p>
                                        )}
                                        
                                        {/* Add to Cart CTA */}
                                        <div className="mt-4 pt-4 border-t border-gray-200">
                                            <div className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-lg p-4 border border-emerald-100">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500 text-white text-xs font-bold">%</span>
                                                    <p className="font-semibold text-sm text-emerald-800">Like this look?</p>
                                                </div>
                                                <p className="text-xs text-emerald-700 mb-3">
                                                    Add all {1 + selectedItems.length} item{selectedItems.length > 0 ? 's' : ''} to cart and get <span className="font-bold">20% off</span> your complete outfit!
                                                </p>
                                                <Button 
                                                    className="w-full h-11 text-white font-bold uppercase tracking-wide text-sm rounded-md shadow-md hover:shadow-lg transition-all"
                                                    style={{ backgroundColor: brandPrimaryColor }}
                                                    onClick={() => {
                                                        // Demo: show alert. In production, this would add items to cart
                                                        alert(`Added ${1 + selectedItems.length} items to cart with 20% discount applied!`);
                                                    }}
                                                >
                                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                                                    </svg>
                                                    Add Complete Look to Cart
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                {/* Result Image/Video */}
                                <div className="space-y-2" ref={videoRef}>
                                    <p className="text-sm font-bold uppercase text-gray-500 text-center">{videoUrl ? "Video Result" : "Virtual Try-On"}</p>
                                    <div className="aspect-[3/4] bg-gray-100 rounded-lg overflow-hidden relative flex items-center justify-center cursor-pointer" onClick={() => !videoUrl && setIsFullscreen(true)}>
                                        {videoUrl ? (
                                            <video src={videoUrl} controls autoPlay loop className="w-full h-full object-contain" />
                                        ) : (
                                            <>
                                                <img src={generatedImage} alt="Try-on result" className="max-w-full max-h-full object-contain" />
                                                <button onClick={(e) => { e.stopPropagation(); setIsFullscreen(true); }} className="absolute top-3 right-3 bg-white/90 hover:bg-white p-2.5 rounded-full shadow-lg">
                                                    <Maximize2 className="w-5 h-5 text-gray-700" />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-4 justify-center pt-4 border-t">
                                <Button onClick={handleTryOn} disabled={isLoading} className="h-12 px-6 text-white rounded-none uppercase" style={{ backgroundColor: brandPrimaryColor }}>
                                    <RefreshCw className="w-4 h-4 mr-2" />Update Look
                                </Button>
                                <Button onClick={handleDownload} variant="outline" className="h-12 px-6 rounded-none uppercase">
                                    <Download className="w-4 h-4 mr-2" />Download
                                </Button>
                                <Button onClick={handleReset} variant="ghost" className="h-12 px-6 rounded-none uppercase">Start Over</Button>
                            </div>
                        </div>
                    )}
                </div>

                <div className="border-t px-6 py-4 bg-gray-50">
                    <p className="text-xs text-gray-400 text-center">Powered by AI • Images are generated for visualization purposes only</p>
                </div>
            </div>

            {isFullscreen && generatedImage && (
                <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center cursor-pointer" onClick={() => setIsFullscreen(false)}>
                    <button className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 rounded-full" onClick={() => setIsFullscreen(false)}>
                        <X className="w-8 h-8 text-white" />
                    </button>
                    <img src={generatedImage} alt="Fullscreen" className="max-w-[95vw] max-h-[95vh] object-contain" onClick={(e) => e.stopPropagation()} />
                </div>
            )}
        </div>
    );
}
