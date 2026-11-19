/**
 * Editorial focal positions for the six sample campaign photographs.
 * Maintain the subject in view as Next/Image cover-crops across aspect ratios.
 * Shared by campaign cards, impact updates, search and the detail dialog.
 */
const focusByImage: Record<string, string> = {
  '/water-community.jpg': '50% 30%',
  '/mosque-community.jpg': '50% 43%',
  '/food-community.jpg': '52% 33%',
  '/water-children.jpg': '50% 36%',
  '/healthcare-community.jpg': '54% 34%',
  '/quran-learning.jpg': '51% 38%',
};

export function campaignImageFocus(src: string): string {
  return focusByImage[src] ?? '50% 42%';
}
