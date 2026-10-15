import CampaignStars from '@/components/campaign/CampaignStars'
import CampaignSpotlight from '@/components/campaign/CampaignSpotlight'
import type { CampaignLook } from '@/lib/campaign-looks'

/**
 * The look's background layers. Purely decorative (aria-hidden), CSS-first: gradients,
 * masks and inline SVG, with a canvas only for the Cinematic stars and a tiny client
 * island only for the Stage pointer light. Everything sits behind the content column
 * (z-0 under z-1) and animates transform / opacity only. All colour comes from the
 * look's tokens, never hard-coded, so the same layers re-colour for every vertical.
 */
export default function CampaignAtmosphere({ look }: { look: CampaignLook }) {
  switch (look) {
    case 'poster':
      return (
        <div aria-hidden className="ot-cl-layer">
          <div className="ot-cl-halftone" />
          <div className="ot-cl-disc" />
          <div className="ot-cl-disc ot-cl-disc--small" />
        </div>
      )

    case 'daylight':
      // The collage shapes are pseudo-elements on the blocks (campaign-looks.css), so the
      // layer itself is just the paper grain.
      return (
        <div aria-hidden className="ot-cl-layer">
          <div className="ot-cl-paper" />
        </div>
      )

    case 'stage':
      return (
        <>
          <CampaignSpotlight />
          <div aria-hidden className="ot-cl-layer ot-cl-band ot-cl-band--top">
            <div className="ot-cl-glow" />
            <div className="ot-cl-grid" />
          </div>
          <div aria-hidden className="ot-cl-layer">
            <div className="ot-cl-vignette" />
          </div>
        </>
      )

    case 'cinematic':
    default:
      return (
        <>
          {(['top', 'bottom'] as const).map(edge => (
            <div key={edge} aria-hidden className={`ot-cl-layer ot-cl-band ot-cl-band--${edge}`}>
              <div className="ot-cl-glow" />
              <div className="ot-cl-grid" />
              <CampaignStars className="ot-cl-stars" />
            </div>
          ))}
        </>
      )
  }
}
