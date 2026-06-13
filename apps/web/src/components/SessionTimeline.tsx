import type { Target } from "../lib/targets";

export function SessionTimeline({ target }: { target: Target }) {
  const slots = [
    { time: "21:10", label: "Polar", value: "0.7 arcmin" },
    { time: "22:05", label: "Meridian", value: "+61 deg" },
    { time: "00:40", label: "Dither", value: "Every 4" },
    { time: "03:25", label: "Park", value: "Auto" }
  ];

  return (
    <footer className="timeline" aria-label="Session timeline">
      <div className="timeline-target">
        <span>Tonight</span>
        <strong>{target.name}</strong>
      </div>
      <div className="timeline-track">
        {slots.map((slot) => (
          <div className="timeline-slot" key={slot.time}>
            <span>{slot.time}</span>
            <strong>{slot.label}</strong>
            <em>{slot.value}</em>
          </div>
        ))}
      </div>
    </footer>
  );
}

