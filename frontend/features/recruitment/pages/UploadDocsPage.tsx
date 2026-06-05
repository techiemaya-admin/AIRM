import { useParams } from 'react-router-dom';
import { useState } from 'react';

export default function UploadDocsPage() {
  const { candidateId, verificationId } = useParams();
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setStatus('uploading');
    setMessage('');
    try {
      const formData = new FormData();
      formData.append('documents', file); // Backend expects 'documents' (array)
      // Corrected API endpoint to match backend route
      const res = await fetch(`/api/recruitment/recruitment/${candidateId}/verification/${verificationId}/upload`, {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        setStatus('success');
        setMessage('Document uploaded successfully!');
      } else {
        setStatus('error');
        setMessage('Upload failed. Please try again.');
      }
    } catch (err) {
      setStatus('error');
      setMessage('An error occurred. Please try again.');
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: '60px auto', padding: 24, background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px #eee' }}>
      <h2 style={{ marginBottom: 16 }}>Upload Documents</h2>
      <form onSubmit={handleUpload}>
        <input type="file" onChange={handleFileChange} required />
        <button type="submit" disabled={status === 'uploading'} style={{ marginTop: 16, width: '100%' }}>
          {status === 'uploading' ? 'Uploading...' : 'Upload'}
        </button>
      </form>
      {message && <div style={{ marginTop: 16, color: status === 'success' ? 'green' : 'red' }}>{message}</div>}
    </div>
  );
}
