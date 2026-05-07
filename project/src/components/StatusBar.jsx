export default function StatusBar({ info }) {
  return (
    <div>
      {info.width} x {info.height} | {info.depth} bit
    </div>
  );
}