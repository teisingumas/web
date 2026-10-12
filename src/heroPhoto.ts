// Hero background photo framing. Shared by the page and the layout editor.
// zoom: image height as % of the hero (100 ≈ cover at 2:1 screens, 95 = 5% zoom-out)
// x / y: CSS background-position percentages.
export const HERO_PHOTO = { zoom: 95, x: 75, y: 50 }

// hero.webp is 1983 × 793
export const HERO_PHOTO_RATIO = 1983 / 793

export function heroPhotoStyle(image: string, photo = HERO_PHOTO) {
  return {
    // Fades at the top and bottom hide the image edges when it is smaller than the hero.
    backgroundImage: `linear-gradient(180deg, #020202 0%, rgba(2,2,2,0) 12%, rgba(2,2,2,0) 88%, #020202 100%), url(${image})`,
    backgroundSize: `100% 100%, auto ${photo.zoom}%`,
    backgroundPosition: `0 0, ${photo.x}% ${photo.y}%`,
    backgroundRepeat: 'no-repeat',
    backgroundColor: '#020202',
  }
}
