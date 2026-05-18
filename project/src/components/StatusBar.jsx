
export default function StatusBar({ info }) {
  return (
    <div className="statusbar">
      <span>Width: {info.width}px</span>
      <span>Height: {info.height}px</span>
      <span>Depth: {info.depth} bit</span>
    </div>
  );
}