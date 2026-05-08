'use client';
import { useAuth } from '../../../context/AuthContext';
import PlacementReadiness from '../../../components/PlacementReadiness';
import SkillsManager from '../../../components/SkillsManager';

export default function PlacementDashboard() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Placement Dashboard</h1>
          <p className="text-gray-600 mt-2">Track your placement readiness and improve your profile</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Placement Readiness Score */}
          <div className="lg:col-span-1">
            <PlacementReadiness studentId={user.id} />
          </div>

          {/* Skills Management */}
          <div className="lg:col-span-1">
            <SkillsManager studentId={user.id} />
          </div>
        </div>

        {/* Additional Info */}
        <div className="mt-8 bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-bold mb-4">How Placement Readiness is Calculated</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">35%</div>
              <div className="text-gray-600">CGPA</div>
              <div className="text-xs text-gray-500 mt-1">Academic performance weight</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">25%</div>
              <div className="text-gray-600">Attendance</div>
              <div className="text-xs text-gray-500 mt-1">Consistency & discipline</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">20%</div>
              <div className="text-gray-600">Homework</div>
              <div className="text-xs text-gray-500 mt-1">Submission discipline</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">20%</div>
              <div className="text-gray-600">Skills</div>
              <div className="text-xs text-gray-500 mt-1">Technical profile strength</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}