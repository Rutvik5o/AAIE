// Slowly drifting aurora blobs over a faded grid
export default function Background() {
  return (
    <div className="bg-scene" aria-hidden="true">
      <div className="aurora a1" />
      <div className="aurora a2" />
      <div className="aurora a3" />
      <div className="grid-overlay" />
    </div>
  );
}
