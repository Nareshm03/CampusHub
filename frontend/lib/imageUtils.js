/**
 * Get the full URL for a profile photo
 * @param {string} photo - The photo filename
 * @returns {string|null} The full URL to the photo or null if no photo
 */
export const getProfilePhotoUrl = (photo) => {
  if (!photo) return null;
  
  // Get the API base URL from environment or use default
  const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';
  
  // Remove /api/v1 to get server root
  const serverURL = baseURL.replace('/api/v1', '');
  
  // Construct the full URL
  return `${serverURL}/uploads/students/${photo}`;
};
