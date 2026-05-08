import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Button from './ui/Button';
import Input from './ui/Input';
import api from '../lib/axios';
import { getProfilePhotoUrl } from '../lib/imageUtils';
import { toast } from 'react-hot-toast';

const PhotoUpload = ({ studentId, currentPhoto, onPhotoUpdate }) => {
  const { user, updateProfilePhoto } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB');
      return;
    }
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      toast.error('Please select a photo first');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('photo', selectedFile);

    try {
      const endpoint = user?.role === 'STUDENT' ? '/students/me/photo' : `/students/${studentId}/photo`;
      const response = await api.post(endpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const newPhoto = response.data.data.profilePhoto;
      onPhotoUpdate(newPhoto);
      updateProfilePhoto(newPhoto);
      setPreview(null);
      setSelectedFile(null);
      toast.success('Profile photo updated!');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const displayPhoto = preview || (currentPhoto ? getProfilePhotoUrl(currentPhoto) : null);

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-4">
        <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 flex-shrink-0">
          {displayPhoto ? (
            <img
              src={displayPhoto}
              alt="Profile"
              className="w-full h-full object-cover"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
              No Photo
            </div>
          )}
        </div>
        <form onSubmit={handleUpload} className="flex-1">
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              type="file"
              name="photo"
              accept="image/*"
              onChange={handleFileSelect}
              className="flex-1"
            />
            <Button type="submit" disabled={uploading || !selectedFile}>
              {uploading ? 'Uploading...' : 'Upload'}
            </Button>
          </div>
          {selectedFile && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{selectedFile.name}</p>
          )}
        </form>
      </div>
    </div>
  );
};

export default PhotoUpload;