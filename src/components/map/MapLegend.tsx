import type { Palette } from "../../theme/palette";
import "./MapLegend.css";

export function MapLegend({ palette }: { palette: Palette }) {
  return (
    <div className="map-legend">
      <span className="map-legend__item">
        <i style={{ background: palette.statusAFaire }} />
        À visiter
      </span>
      <span className="map-legend__item">
        <i style={{ background: palette.statusFait }} />
        Visité
      </span>
      <span className="map-legend__item">
        <i
          style={{
            background: "none",
            borderTop: `2px dashed ${palette.terracottaDecorative}`,
          }}
        />
        Tracé réel (GPX)
      </span>
    </div>
  );
}
