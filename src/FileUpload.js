import React, { useState } from 'react';
import axios from 'axios';

const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];

export default function FileUpload() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [progress, setProgress] = useState(0);
  const [uploaded, setUploaded] = useState(null);
  const [error, setError] = useState('');

  const handleChange = e => {
    const f = e.target.files[0];
    setError('');
    setUploaded(null);
    setProgress(0);
    setPreview(null);
    if (!f) return;
    if (!allowedTypes.includes(f.type)) {
      setError('Only images and PDFs allowed.');
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      setError('File size must be ≤ 5MB.');
      return;
    }
    setFile(f);
    if (f.type.startsWith('image/')) setPreview(URL.createObjectURL(f));
  };

  const handleUpload = async () => {
    if (!file) return;
    setError('');
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await axios.post('http://localhost:4000/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: e => setProgress(Math.round((e.loaded * 100) / e.total))
      });
      setUploaded(res.data);
      setFile(null);
      setPreview(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Upload failed.');
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: '2rem auto', padding: 20, border: '1px solid #ccc' }}>
      <input type="file" onChange={handleChange} />
      {preview && <img src={preview} alt="preview" style={{ maxWidth: '100%', margin: '1rem 0' }} />}
      {progress > 0 && progress < 100 && <div>Uploading: {progress}%</div>}
      <button onClick={handleUpload} disabled={!file}>Upload</button>
      {uploaded && (
        <div>
          <strong>Uploaded:</strong> {uploaded.name} <br />
          <a href={`http://localhost:4000${uploaded.url}`} target="_blank" rel="noopener noreferrer">View File</a>
        </div>
      )}
      {error && <div style={{ color: 'red' }}>{error}</div>}
    </div>
  );
}
