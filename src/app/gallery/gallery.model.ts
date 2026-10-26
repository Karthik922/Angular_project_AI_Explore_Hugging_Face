// Mirrors Nest_Js_Project/src/gallery/gallery.model.ts.
export const GALLERY_CATEGORIES = ['Headphones', 'Smart watches', 'Running shoes', 'Cameras'] as const;
export type GalleryCategory = (typeof GALLERY_CATEGORIES)[number];

export interface GalleryImage {
  id: number;
  title: string;
  category: GalleryCategory;
  /** Price in INR. */
  price: number;
  /** Amazon CDN file id, e.g. `711l4y8aNlL`; turned into a sized URL by `amazonImageLoader`. */
  imageId: string;
  alt: string;
}

export interface GalleryResponse {
  data: GalleryImage[];
  meta: {
    total: number;
    categories: { name: GalleryCategory; count: number }[];
  };
}

/** Development-only failure modes supported by `GET /gallery?simulate=`. */
export const SIMULATIONS = ['slow', 'timeout', 'error', 'broken-image'] as const;
export type Simulation = (typeof SIMULATIONS)[number];

export function isGalleryCategory(value: string | undefined): value is GalleryCategory {
  return (GALLERY_CATEGORIES as readonly string[]).includes(value ?? '');
}
