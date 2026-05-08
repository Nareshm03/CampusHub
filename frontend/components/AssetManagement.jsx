'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from '../lib/axios';
import Card from './ui/Card';
import Button from './ui/Button';
import Modal from './ui/Modal';
import { 
  PlusIcon, 
  CubeIcon, 
  WrenchScrewdriverIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon 
} from '@heroicons/react/24/outline';

const AssetManagement = () => {
  const { user } = useAuth();
  const [assets, setAssets] = useState([]);
  const [stats, setStats] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    category: 'other',
    description: '',
    location: { building: '', room: '' },
    purchaseDate: '',
    purchasePrice: ''
  });

  const categories = [
    { value: 'laboratory_equipment', label: 'Laboratory Equipment' },
    { value: 'library_book', label: 'Library Book' },
    { value: 'furniture', label: 'Furniture' },
    { value: 'electronics', label: 'Electronics' },
    { value: 'vehicle', label: 'Vehicle' },
    { value: 'other', label: 'Other' }
  ];

  const statuses = [
    { value: 'available', label: 'Available', color: 'bg-green-100 text-green-800' },
    { value: 'in_use', label: 'In Use', color: 'bg-blue-100 text-blue-800' },
    { value: 'maintenance', label: 'Maintenance', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'damaged', label: 'Damaged', color: 'bg-red-100 text-red-800' },
    { value: 'disposed', label: 'Disposed', color: 'bg-gray-100 text-gray-800' }
  ];

  useEffect(() => {
    fetchAssets();
    fetchStats();
  }, []);

  const fetchAssets = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get('/assets');
      setAssets(response.data.data);
    } catch (error) {
      console.error('Error fetching assets:', error);
      if (error.code === 'ERR_NETWORK') {
        setError('Cannot connect to server. Please make sure the backend is running on port 5000.');
      } else {
        setError('Failed to load assets. Please try refreshing the page.');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get('/assets/stats');
      setStats(response.data.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Clean up the data before sending
      const cleanedData = {
        name: formData.name,
        category: formData.category,
        description: formData.description || undefined,
        purchaseDate: formData.purchaseDate || undefined,
        purchasePrice: formData.purchasePrice ? parseFloat(formData.purchasePrice) : undefined,
        location: {
          building: formData.location.building || undefined,
          room: formData.location.room || undefined
        }
      };

      console.log('Sending asset data:', cleanedData);
      await axios.post('/assets', cleanedData);
      alert('Asset created successfully!');
      setFormData({
        name: '',
        category: 'other',
        description: '',
        location: { building: '', room: '' },
        purchaseDate: '',
        purchasePrice: ''
      });
      setShowForm(false);
      fetchAssets();
      fetchStats();
    } catch (error) {
      console.error('Error creating asset:', error);
      console.error('Error response:', error.response?.data);
      if (error.response?.status === 403) {
        alert('Access denied. Only administrators can create assets.');
      } else if (error.response?.status === 400) {
        const errorMsg = error.response?.data?.message || 'Please check all fields';
        alert(`Invalid data: ${errorMsg}`);
        console.error('Validation error details:', errorMsg);
      } else {
        alert('Failed to create asset. Please try again.');
      }
    }
  };

  const getStatusColor = (status) => {
    return statuses.find(s => s.value === status)?.color || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading assets...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="p-6 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
          <div className="flex items-start gap-3">
            <ExclamationTriangleIcon className="w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold text-red-900 dark:text-red-100">Error</p>
              <p className="text-red-700 dark:text-red-300 mt-1">{error}</p>
              <p className="mt-2 text-sm text-red-600 dark:text-red-400">Current user role: {user?.role || 'Not logged in'}</p>
              <Button 
                onClick={() => { fetchAssets(); fetchStats(); }}
                className="mt-4 bg-red-600 hover:bg-red-700"
              >
                Retry
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <CubeIcon className="w-10 h-10 text-blue-600" />
              Asset Management
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Track and manage college assets
            </p>
          </div>
          {user?.role === 'ADMIN' && (
            <Button
              onClick={() => setShowForm(true)}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <PlusIcon className="w-5 h-5 mr-2" />
              Add Asset
            </Button>
          )}
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {stats.map(stat => (
          <Card key={stat._id} className="p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg capitalize text-gray-900 dark:text-white">
                {stat._id.replace('_', ' ')}
              </h3>
              <CubeIcon className="w-8 h-8 text-blue-600" />
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Total</span>
                <span className="font-bold text-lg text-gray-900 dark:text-white">{stat.total}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Available</span>
                <span className="font-semibold text-green-600 dark:text-green-400">{stat.available}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">In Use</span>
                <span className="font-semibold text-blue-600 dark:text-blue-400">{stat.inUse}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Maintenance</span>
                <span className="font-semibold text-yellow-600 dark:text-yellow-400">{stat.maintenance}</span>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Add New Asset</h2>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full p-2 border rounded-lg"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                  className="w-full p-2 border rounded-lg"
                >
                  {categories.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full p-2 border rounded-lg h-20"
                />
              </div>
              <div className="grid grid-cols-2 gap-2 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Building</label>
                  <input
                    type="text"
                    value={formData.location.building}
                    onChange={(e) => setFormData({
                      ...formData,
                      location: {...formData.location, building: e.target.value}
                    })}
                    className="w-full p-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Room</label>
                  <input
                    type="text"
                    value={formData.location.room}
                    onChange={(e) => setFormData({
                      ...formData,
                      location: {...formData.location, room: e.target.value}
                    })}
                    className="w-full p-2 border rounded-lg"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Purchase Date</label>
                  <input
                    type="date"
                    value={formData.purchaseDate}
                    onChange={(e) => setFormData({...formData, purchaseDate: e.target.value})}
                    className="w-full p-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Purchase Price</label>
                  <input
                    type="number"
                    value={formData.purchasePrice}
                    onChange={(e) => setFormData({...formData, purchasePrice: e.target.value})}
                    className="w-full p-2 border rounded-lg"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  Add Asset
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assets List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Asset ID</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Name</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Category</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Location</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Status</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Condition</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {assets.map(asset => (
              <tr key={asset._id}>
                <td className="px-4 py-3 text-sm font-mono">{asset.assetId}</td>
                <td className="px-4 py-3 text-sm font-medium">{asset.name}</td>
                <td className="px-4 py-3 text-sm capitalize">
                  {asset.category.replace('_', ' ')}
                </td>
                <td className="px-4 py-3 text-sm">
                  {asset.location?.building} {asset.location?.room}
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(asset.status)}`}>
                    {asset.status.replace('_', ' ').toUpperCase()}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm capitalize">{asset.condition}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AssetManagement;