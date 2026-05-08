'use client';
import { useState, useEffect } from 'react';
import { Settings, Lock, Unlock, Save, RotateCcw, AlertTriangle } from 'lucide-react';
import api from '../lib/axios';

export default function SystemSettings() {
  const [configs, setConfigs] = useState({});
  const [semesterLocks, setSemesterLocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('attendance');

  useEffect(() => {
    fetchConfigs();
    fetchSemesterLocks();
  }, []);

  const fetchConfigs = async () => {
    try {
      const response = await api.get('/config/configs');
      setConfigs(response.data);
    } catch (error) {
      console.error('Failed to fetch configs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSemesterLocks = async () => {
    try {
      const response = await api.get('/config/semester-locks');
      setSemesterLocks(response.data);
    } catch (error) {
      console.error('Failed to fetch semester locks:', error);
    }
  };

  const updateConfig = async (key, value) => {
    try {
      await api.put(`/config/configs/${key}`, {
        value, 
        lastModifiedBy: 'admin'
      });
      
      // Update local state
      setConfigs(prev => ({
        ...prev,
        [getCategory(key)]: prev[getCategory(key)]?.map(config => 
          config.key === key ? { ...config, value } : config
        )
      }));
    } catch (error) {
      console.error('Failed to update config:', error);
    }
  };

  const getCategory = (key) => key.split('.')[0];

  const lockSemester = async (semester, academicYear, modules) => {
    try {
      await api.post('/config/semester-locks', {
        semester,
        academicYear,
        modules,
        lockReason: 'Administrative lock',
        lockedBy: 'admin'
      });
      fetchSemesterLocks();
    } catch (error) {
      console.error('Failed to lock semester:', error);
    }
  };

  const unlockSemester = async (lockId) => {
    try {
      await api.delete(`/config/semester-locks/${lockId}`);
      fetchSemesterLocks();
    } catch (error) {
      console.error('Failed to unlock semester:', error);
    }
  };

  const renderConfigInput = (config) => {
    const handleChange = (value) => {
      updateConfig(config.key, value);
    };

    switch (config.dataType) {
      case 'boolean':
        return (
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={config.value}
              onChange={(e) => handleChange(e.target.checked)}
              className="mr-2"
            />
            <span className={config.value ? 'text-green-600' : 'text-red-600'}>
              {config.value ? 'Enabled' : 'Disabled'}
            </span>
          </label>
        );
      case 'number':
        return (
          <input
            type="number"
            value={config.value}
            onChange={(e) => handleChange(Number(e.target.value))}
            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        );
      case 'object':
        return (
          <textarea
            value={JSON.stringify(config.value, null, 2)}
            onChange={(e) => {
              try {
                handleChange(JSON.parse(e.target.value));
              } catch (err) {
                // Invalid JSON, don't update
              }
            }}
            rows={6}
            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
          />
        );
      default:
        return (
          <input
            type="text"
            value={config.value}
            onChange={(e) => handleChange(e.target.value)}
            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        );
    }
  };

  const tabs = [
    { id: 'attendance', label: 'Attendance', icon: '📊' },
    { id: 'grading', label: 'Grading', icon: '📝' },
    { id: 'submission', label: 'Submissions', icon: '⏰' },
    { id: 'features', label: 'Features', icon: '🔧' },
    { id: 'system', label: 'System', icon: '⚙️' },
    { id: 'locks', label: 'Semester Locks', icon: '🔒' }
  ];

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded mb-6"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Settings className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">System Settings</h1>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b">
            <nav className="flex space-x-8 px-6">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-2 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'locks' ? (
              // Semester Locks Tab
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold">Semester Data Locks</h2>
                  <button
                    onClick={() => lockSemester('Fall', '2024', ['attendance', 'marks', 'homework'])}
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 flex items-center gap-2"
                  >
                    <Lock className="h-4 w-4" />
                    Lock Current Semester
                  </button>
                </div>

                <div className="grid gap-4">
                  {semesterLocks.map((lock) => (
                    <div key={lock._id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-bold text-lg">
                            {lock.semester} {lock.academicYear}
                          </h3>
                          <div className="flex items-center gap-2 mt-2">
                            {lock.isLocked ? (
                              <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-sm flex items-center gap-1">
                                <Lock className="h-3 w-3" />
                                Locked
                              </span>
                            ) : (
                              <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-sm flex items-center gap-1">
                                <Unlock className="h-3 w-3" />
                                Unlocked
                              </span>
                            )}
                          </div>
                          {lock.lockedModules.length > 0 && (
                            <div className="mt-2">
                              <p className="text-sm text-gray-600">Locked modules:</p>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {lock.lockedModules.map((module, idx) => (
                                  <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                                    {module.module}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        {lock.isLocked && (
                          <button
                            onClick={() => unlockSemester(lock._id)}
                            className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm flex items-center gap-1"
                          >
                            <Unlock className="h-3 w-3" />
                            Unlock
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              // Configuration Tabs
              <div>
                <h2 className="text-xl font-bold mb-6 capitalize">{activeTab} Settings</h2>
                
                {configs[activeTab] && (
                  <div className="grid gap-6">
                    {configs[activeTab].map((config) => (
                      <div key={config.key} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="font-medium text-gray-900">
                              {config.key.split('.').pop().replace(/_/g, ' ').toUpperCase()}
                            </h3>
                            <p className="text-sm text-gray-600">{config.description}</p>
                          </div>
                          {config.requiresRestart && (
                            <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              Restart Required
                            </span>
                          )}
                        </div>
                        
                        <div className="mt-3">
                          {renderConfigInput(config)}
                        </div>
                        
                        {config.lastModifiedBy && (
                          <div className="mt-2 text-xs text-gray-500">
                            Last modified by {config.lastModifiedBy} on{' '}
                            {new Date(config.lastModifiedAt).toLocaleString()}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* System Status */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">System Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {configs.features ? Object.values(configs.features).filter(c => c.value).length : 0}
              </div>
              <div className="text-sm text-gray-600">Active Modules</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {semesterLocks.filter(lock => lock.isLocked).length}
              </div>
              <div className="text-sm text-gray-600">Locked Semesters</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {configs.system?.find(c => c.key === 'system.maintenance_mode')?.value ? 'ON' : 'OFF'}
              </div>
              <div className="text-sm text-gray-600">Maintenance Mode</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}