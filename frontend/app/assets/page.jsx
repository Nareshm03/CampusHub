'use client';
import ProtectedRoute from '../../components/ProtectedRoute';
import AssetManagement from '../../components/AssetManagement';

export default function AssetsPage() {
  return (
    <ProtectedRoute allowedRoles={['ADMIN']}>
      <AssetManagement />
    </ProtectedRoute>
  );
}