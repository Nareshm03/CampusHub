'use client';
import { useState, useEffect } from 'react';
import { Trophy, Target, Award, TrendingUp, Building2 } from 'lucide-react';
import api from '../lib/axios';

export default function PlacementReadiness({ studentId }) {
  const [readiness, setReadiness] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReadiness();
  }, [studentId]);

  const fetchReadiness = async () => {
    try {
      const response = await api.get(`/placement/readiness/${studentId}`);
      setReadiness(response.data);
    } catch (error) {
      console.error('Failed to fetch readiness:', error);
    } finally {
      setLoading(false);
    }
  };

  const recalculate = async () => {
    setLoading(true);
    try {
      const response = await api.post(`/placement/readiness/${studentId}/calculate`);
      setReadiness(response.data);
    } catch (error) {
      console.error('Failed to recalculate:', error);
    } finally {
      setLoading(false);
    }
  };

  const getLevelColor = (level) => {
    switch (level) {
      case 'EXCELLENT': return 'text-green-600 bg-green-100';
      case 'HIGH': return 'text-blue-600 bg-blue-100';
      case 'MEDIUM': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-red-600 bg-red-100';
    }
  };

  const getScoreColor = (score) => {
    if (score >= 85) return 'text-green-600';
    if (score >= 70) return 'text-blue-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded mb-4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!readiness) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 text-center">
        <p className="text-gray-500">No readiness data available</p>
        <button 
          onClick={recalculate}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Calculate Score
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Trophy className="h-6 w-6 text-yellow-500" />
          <h3 className="text-xl font-bold">Placement Readiness</h3>
        </div>
        <button 
          onClick={recalculate}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          Recalculate
        </button>
      </div>

      {/* Main Score */}
      <div className="text-center mb-6">
        <div className={`text-4xl font-bold mb-2 ${getScoreColor(readiness.totalScore)}`}>
          {readiness.totalScore}%
        </div>
        <div className={`inline-block px-4 py-2 rounded-full text-sm font-medium ${getLevelColor(readiness.level)}`}>
          {readiness.level}
        </div>
      </div>

      {/* Score Breakdown */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-blue-500" />
            <span className="text-sm font-medium">CGPA</span>
          </div>
          <div className="text-lg font-bold">{readiness.scores?.cgpa?.value || 'N/A'}</div>
          <div className="text-sm text-gray-600">{readiness.scores?.cgpa?.score || 0}/100</div>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Target className="h-4 w-4 text-green-500" />
            <span className="text-sm font-medium">Attendance</span>
          </div>
          <div className="text-lg font-bold">{readiness.scores?.attendance?.value || 0}%</div>
          <div className="text-sm text-gray-600">{readiness.scores?.attendance?.score || 0}/100</div>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Award className="h-4 w-4 text-purple-500" />
            <span className="text-sm font-medium">Homework</span>
          </div>
          <div className="text-lg font-bold">{readiness.scores?.homework?.value || 0}%</div>
          <div className="text-sm text-gray-600">{readiness.scores?.homework?.score || 0}/100</div>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Building2 className="h-4 w-4 text-orange-500" />
            <span className="text-sm font-medium">Skills</span>
          </div>
          <div className="text-lg font-bold">{readiness.scores?.skills?.value || 0}</div>
          <div className="text-sm text-gray-600">{readiness.scores?.skills?.score || 0}/100</div>
        </div>
      </div>

      {/* Eligible Companies */}
      {readiness.eligibleCompanies && readiness.eligibleCompanies.length > 0 && (
        <div className="border-t pt-4">
          <h4 className="font-medium mb-3 text-gray-700">Eligible Companies</h4>
          <div className="flex flex-wrap gap-2">
            {readiness.eligibleCompanies.map((company) => (
              <span 
                key={company}
                className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
              >
                {company}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Improvement Tips */}
      <div className="mt-4 p-4 bg-yellow-50 rounded-lg">
        <h4 className="font-medium text-yellow-800 mb-2">💡 Improvement Tips</h4>
        <ul className="text-sm text-yellow-700 space-y-1">
          {readiness.totalScore < 70 && <li>• Focus on improving CGPA through better academic performance</li>}
          {readiness.scores?.attendance?.value < 80 && <li>• Maintain consistent attendance (target: 85%+)</li>}
          {readiness.scores?.homework?.value < 85 && <li>• Submit homework on time to show discipline</li>}
          {readiness.scores?.skills?.value < 5 && <li>• Add more technical skills and certifications</li>}
        </ul>
      </div>
    </div>
  );
}