"use client";

import { useEffect, useState, useRef } from "react";
import { TryOnModal } from "@/components/TryOnModal";

const MACYS_IMG = (id: string) => `/product-images/${id}.jpg`;

const productData = {
  name: "Men's Cable-Knit Cotton Sweater",
  brand: "Macy's",
  images: [
    MACYS_IMG("32922450"),
    MACYS_IMG("32922451"),
    MACYS_IMG("32922452"),
    MACYS_IMG("32922453"),
  ],
  colors: [
    {
      id: "camel-melange",
      name: "Camel Melange",
      hex: "#C4A86B",
      images: [
        MACYS_IMG("32922450"),
        MACYS_IMG("32922451"),
        MACYS_IMG("32922452"),
        MACYS_IMG("32922453"),
      ],
    },
    {
      id: "sunfish-yellow",
      name: "Sunfish Yellow",
      hex: "#E8D44D",
      images: [
        MACYS_IMG("35726308"),
        MACYS_IMG("35726314"),
        MACYS_IMG("35726315"),
        MACYS_IMG("35726316"),
      ],
    },
    {
      id: "austin-blue",
      name: "Austin Blue",
      hex: "#6B8DAE",
      images: [
        MACYS_IMG("35726313"),
        MACYS_IMG("35726317"),
        MACYS_IMG("35726318"),
      ],
    },
    {
      id: "bright-navy",
      name: "Bright Navy",
      hex: "#1C2951",
      images: [
        MACYS_IMG("35726319"),
        MACYS_IMG("35726320"),
        MACYS_IMG("35726321"),
        MACYS_IMG("35726322"),
      ],
    },
    {
      id: "pale-red",
      name: "Pale Red",
      hex: "#C75B5B",
      images: [
        MACYS_IMG("35726325"),
        MACYS_IMG("35726326"),
        MACYS_IMG("35726327"),
      ],
    },
    {
      id: "garden-trail-heather",
      name: "Garden Trail Heather",
      hex: "#5A7247",
      images: [
        MACYS_IMG("35726328"),
        MACYS_IMG("35726330"),
        MACYS_IMG("35726331"),
      ],
    },
    {
      id: "new-aqua",
      name: "New Aqua",
      hex: "#6EC5C8",
      images: [
        MACYS_IMG("36025602"),
        MACYS_IMG("36025605"),
        MACYS_IMG("36025615"),
        MACYS_IMG("36025619"),
      ],
    },
    {
      id: "sailing-orange",
      name: "Sailing Orange",
      hex: "#E07030",
      images: [
        MACYS_IMG("36140467"),
        MACYS_IMG("36140472"),
        MACYS_IMG("36140474"),
        MACYS_IMG("36140475"),
      ],
    },
  ],
  outfitCategories: [
    {
      id: "jackets",
      label: "Jackets & Outerwear",
      products: [
        { id: "jacket-1", name: "Michael Kors Classic-Fit Wool Cashmere Kavon Overcoat", image: MACYS_IMG("27426986"), category: "jackets" },
        { id: "jacket-2", name: "Nautica Classic-Fit Camber Wool Overcoat", image: MACYS_IMG("22741195"), category: "jackets" },
        { id: "jacket-3", name: "Calvin Klein Prosper Wool-Blend Slim Fit Overcoat", image: MACYS_IMG("27434657"), category: "jackets" },
        { id: "jacket-4", name: "London Fog Signature Wool-Blend Overcoat", image: MACYS_IMG("3494551"), category: "jackets" },
        { id: "jacket-5", name: "Tommy Hilfiger Modern-Fit Wool-Blend Overcoat", image: MACYS_IMG("32429870"), category: "jackets" },
        { id: "jacket-6", name: "Lauren Ralph Lauren Coventry Wool-Blend Overcoat", image: MACYS_IMG("3520061"), category: "jackets" },
      ],
    },
    {
      id: "pants",
      label: "Pants",
      products: [
        { id: "pants-1", name: "Tommy Hilfiger TH Flex Stretch Solid Performance Pants", image: MACYS_IMG("33892067"), category: "pants" },
        { id: "pants-2", name: "Polo Ralph Lauren Straight-Fit Stretch Chino Pants", image: MACYS_IMG("26326648"), category: "pants" },
        { id: "pants-3", name: "Calvin Klein Slim-Fit Stretch Dress Pants", image: MACYS_IMG("34747308"), category: "pants" },
        { id: "pants-4", name: "Haggar Premium Comfort Classic-Fit Dress Pants", image: MACYS_IMG("22261115"), category: "pants" },
        { id: "pants-5", name: "Michael Kors Classic Fit Performance Dress Pants", image: MACYS_IMG("23960177"), category: "pants" },
        { id: "pants-6", name: "Dockers Premium No Iron Khaki Flat-Front Pants", image: MACYS_IMG("8154464"), category: "pants" },
      ],
    },
    {
      id: "shirts",
      label: "Shirts",
      products: [
        { id: "shirt-1", name: "Brooks Brothers Non-Iron Spread Collar Pinpoint Dress Shirt", image: MACYS_IMG("33636775"), category: "shirts" },
        { id: "shirt-2", name: "Brooks Brothers Non-Iron Polo Button-Down Dress Shirt", image: MACYS_IMG("33636779"), category: "shirts" },
        { id: "shirt-3", name: "Brooks Brothers Thin Stripe Broadcloth Dress Shirt", image: MACYS_IMG("33636782"), category: "shirts" },
        { id: "shirt-4", name: "Calvin Klein Non-Iron Herringbone Dress Shirt", image: MACYS_IMG("3502496"), category: "shirts" },
        { id: "shirt-5", name: "Brooks Brothers Non-Iron Spread Collar Dress Shirt", image: MACYS_IMG("33636768"), category: "shirts" },
        { id: "shirt-6", name: "Brooks Brothers Non-Iron Solid Pinpoint Dress Shirt", image: MACYS_IMG("33636772"), category: "shirts" },
      ],
    },
    {
      id: "shoes",
      label: "Shoes",
      products: [
        { id: "shoes-1", name: "Clarks Steadwell Cap Dress Shoe", image: MACYS_IMG("33175084"), category: "shoes" },
        { id: "shoes-2", name: "Cole Haan Hiday Casualized Hybrid Oxfords", image: MACYS_IMG("29020859"), category: "shoes" },
        { id: "shoes-3", name: "Calvin Klein Brodie Lace-Up Dress Oxford", image: MACYS_IMG("1749786"), category: "shoes" },
        { id: "shoes-4", name: "Florsheim Ruvo Cap-Toe Oxford Dress Shoe", image: MACYS_IMG("27359569"), category: "shoes" },
        { id: "shoes-5", name: "Cole Haan Hiday Hybrid Oxfords in Brown", image: MACYS_IMG("29022648"), category: "shoes" },
        { id: "shoes-6", name: "Calvin Klein Brodie Oxford in Tan", image: MACYS_IMG("1749784"), category: "shoes" },
      ],
    },
    {
      id: "bags",
      label: "Bags",
      products: [
        { id: "bag-1", name: "Kenneth Cole Colombian Leather Messenger Bag", image: MACYS_IMG("16096717"), category: "bags" },
        { id: "bag-2", name: "Fossil Buckner Leather Messenger Bag", image: MACYS_IMG("12055470"), category: "bags" },
        { id: "bag-3", name: "Polo Ralph Lauren Leather Backpack", image: MACYS_IMG("20721628"), category: "bags" },
        { id: "bag-4", name: "Michael Kors Malone Messenger Bag", image: MACYS_IMG("31604740"), category: "bags" },
      ],
    },
    {
      id: "watches",
      label: "Watches",
      products: [
        { id: "watch-1", name: "Citizen Eco Drive Classic Watch 42mm", image: MACYS_IMG("20227269"), category: "watches" },
        { id: "watch-2", name: "Bulova Chronoport Quartz Chronograph Watch", image: MACYS_IMG("35468796"), category: "watches" },
        { id: "watch-3", name: "Citizen Drive Eco-Drive Black Watch 42mm", image: MACYS_IMG("8753585"), category: "watches" },
        { id: "watch-4", name: "Citizen Brycen Super Titanium Chronograph 43mm", image: MACYS_IMG("10136418"), category: "watches" },
      ],
    },
    {
      id: "belts",
      label: "Belts",
      products: [
        { id: "belt-1", name: "Tommy Hilfiger Reversible Dress Belt", image: MACYS_IMG("19791671"), category: "belts" },
        { id: "belt-2", name: "Tommy Hilfiger Perfed-Edge Belt", image: MACYS_IMG("15276447"), category: "belts" },
        { id: "belt-3", name: "Tommy Hilfiger Leather Dress Belt", image: MACYS_IMG("22521815"), category: "belts" },
        { id: "belt-4", name: "Kenneth Cole Reaction Reversible Leather Belt", image: MACYS_IMG("16096754"), category: "belts" },
      ],
    },
    {
      id: "ties",
      label: "Ties",
      products: [
        { id: "tie-1", name: "Tommy Hilfiger Sapphire Solid Tie", image: MACYS_IMG("24475198"), category: "ties" },
        { id: "tie-2", name: "Tommy Hilfiger Solid Textured Stripe Tie", image: MACYS_IMG("23706230"), category: "ties" },
        { id: "tie-3", name: "Tommy Hilfiger Railroad Plaid Tie", image: MACYS_IMG("29863926"), category: "ties" },
        { id: "tie-4", name: "Calvin Klein Holly Slim Check Silk Tie", image: MACYS_IMG("15883264"), category: "ties" },
      ],
    },
    {
      id: "hats",
      label: "Hats",
      products: [
        { id: "hat-1", name: "Scala Dorfman Pacific Braided Fedora", image: MACYS_IMG("14564186"), category: "hats" },
        { id: "hat-2", name: "Scala Wool Felt Fedora Hat", image: MACYS_IMG("33325873"), category: "hats" },
        { id: "hat-3", name: "MANGO Ribbed Wool Beanie Hat", image: MACYS_IMG("34927227"), category: "hats" },
        { id: "hat-4", name: "Scala Classic Wool Fedora", image: MACYS_IMG("33310131"), category: "hats" },
      ],
    },
  ],
};

export default function Page() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data === "openTryOnModal") {
        setIsModalOpen(true);
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const injectScript = () => {
      try {
        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        if (!iframeDoc) return;

        const tryOnButton = iframeDoc.getElementById("try-on-trigger");
        if (tryOnButton) {
          tryOnButton.onclick = () => {
            window.parent.postMessage("openTryOnModal", "*");
          };
        }

        if (iframe.contentWindow) {
          (iframe.contentWindow as any).openTryOnModal = () => {
            window.parent.postMessage("openTryOnModal", "*");
          };
        }
      } catch (e) {
        // Cross-origin - ignore
      }
    };

    iframe.addEventListener("load", injectScript);
    return () => iframe.removeEventListener("load", injectScript);
  }, []);

  return (
    <>
      <iframe
        ref={iframeRef}
        src="/cloned-page.html"
        className="w-full h-screen border-0"
        title="Macy's - Men's Cable-Knit Cotton Sweater"
      />

      <TryOnModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        garmentName={productData.name}
        initialColor={productData.colors[0]}
        colors={productData.colors}
        outfitCategories={productData.outfitCategories}
        brandPrimaryColor="#000000"
      />
    </>
  );
}
