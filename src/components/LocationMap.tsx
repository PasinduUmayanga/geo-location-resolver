const BBOX_DELTA = 0.01;

interface LocationMapProps {
  latitude: number;
  longitude: number;
}

function round(value: number): number {
  return Math.round(value * 1e6) / 1e6;
}

export default function LocationMap({ latitude, longitude }: LocationMapProps) {
  const bbox = [
    round(longitude - BBOX_DELTA),
    round(latitude - BBOX_DELTA),
    round(longitude + BBOX_DELTA),
    round(latitude + BBOX_DELTA),
  ].join("%2C");
  const marker = `${latitude}%2C${longitude}`;

  const embedSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&marker=${marker}`;
  const largerMapHref = `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=15/${latitude}/${longitude}`;

  return (
    <div className="mt-4">
      <iframe
        title="Map showing the resolved location"
        src={embedSrc}
        loading="lazy"
        className="h-48 w-full rounded-lg border border-slate-200 sm:h-64 lg:h-80"
      />
      <a
        href={largerMapHref}
        target="_blank"
        rel="noreferrer"
        className="mt-1 inline-block text-xs text-blue-600 hover:underline"
      >
        View larger map
      </a>
    </div>
  );
}
