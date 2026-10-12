// Hero background photo framing. Shared by the page and the layout editor.
// zoom: image height as % of the hero (100 ≈ cover at 2:1 screens, 95 = 5% zoom-out)
// x / y: CSS background-position percentages.
export const HERO_PHOTO = { zoom: 95, x: 57.8, y: 35.9 }

// hero.webp is 1983 × 793
export const HERO_PHOTO_RATIO = 1983 / 793

// Image and edge colour come from CSS variables so the light theme can swap to the
// white-background photo (same 1983 × 793 framing): --hero-img, --photo-edge(-rgb).
export function heroPhotoStyle(photo = HERO_PHOTO) {
  return {
    // Fades at the top and bottom hide the image edges when it is smaller than the hero.
    backgroundImage: 'linear-gradient(180deg, var(--photo-edge) 0%, rgba(var(--photo-edge-rgb), 0) 12%, rgba(var(--photo-edge-rgb), 0) 88%, var(--photo-edge) 100%), var(--hero-img)',
    backgroundSize: `100% 100%, auto ${photo.zoom}%`,
    backgroundPosition: `0 0, ${photo.x}% ${photo.y}%`,
    backgroundRepeat: 'no-repeat',
    backgroundColor: 'var(--photo-edge)',
  }
}
