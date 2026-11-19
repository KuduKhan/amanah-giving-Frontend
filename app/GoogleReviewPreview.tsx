'use client';

import { useState } from 'react';

const GOOGLE_MAPS_SEARCH = 'https://www.google.com/maps/search/?api=1&query=Amanah%20Giving%20Kenya';

/**
 * A genuine Google Business Profile review URL is required before exposing
 * "Write a Google review". Never create an apparent public star score from
 * unverified local votes or fabricate a review destination.
 */
export function getGoogleReviewDestination(value?: string): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:') return null;
    const host = url.hostname.toLowerCase();
    if (host === 'g.page' && /^\/r\/[^/]+\/review\/?$/.test(url.pathname)) return url.toString();
    if (['www.google.com', 'google.com', 'maps.google.com'].includes(host)
      && (url.pathname.startsWith('/maps/') || url.pathname === '/local/writereview'
        || url.pathname === '/maps')) return url.toString();
    return null;
  } catch {
    return null;
  }
}

const officialReviewUrl = getGoogleReviewDestination(process.env.NEXT_PUBLIC_AMANAH_GOOGLE_REVIEW_URL);

export default function GoogleReviewPreview() {
  const [previewRating, setPreviewRating] = useState(0);
  return (
    <section className="google-review-preview" aria-labelledby="google-review-preview-title">
      <div className="google-review-preview-heading">
        <span className="google-review-g" aria-hidden="true">G</span>
        <div>
          <strong id="google-review-preview-title">Google reviews</strong>
          <span>{officialReviewUrl ? 'Share your experience' : 'Review profile not connected yet'}</span>
        </div>
      </div>
      <div className="google-review-preview-actions">
        <div className="google-review-stars" role="group" aria-label="Preview a star rating">
          {[1, 2, 3, 4, 5].map(star => (
            <button type="button" key={star} aria-label={`Preview ${star} out of 5 stars`}
              aria-pressed={previewRating === star} onClick={() => setPreviewRating(star)}>
              <span aria-hidden="true">{previewRating >= star ? '★' : '☆'}</span>
            </button>
          ))}
        </div>
        <a className="google-review-link"
          href={officialReviewUrl || GOOGLE_MAPS_SEARCH}
          target="_blank" rel="noopener noreferrer"
          aria-label={officialReviewUrl
            ? 'Open the verified Amanah Giving Google review page'
            : 'Search Google Maps for Amanah Giving in Kenya; a business listing has not been verified'}>
          {officialReviewUrl ? 'Review on Google' : 'Find on Google'}
          <span aria-hidden="true">↗</span>
        </a>
      </div>
      <p className="google-review-preview-status" role="status" aria-live="polite">
        {previewRating
          ? `${previewRating} of 5 stars selected as a preview. Nothing has been published to Google.`
          : 'Interactive rating preview only. No public rating or review count is claimed.'}
      </p>
    </section>
  );
}
