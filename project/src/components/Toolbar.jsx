export default function Toolbar({ onUpload, onDownloadPNG, onDownloadGB7, setTool }) {
  return (
    <div>
      <input type="file" onChange={onUpload} />
      <button onClick={onDownloadPNG}>PNG</button>
      <button onClick={onDownloadGB7}>GB7</button>
      <button onClick={() => setTool("eyedropper")}>Eyedropper</button>

    </div>
  );
}