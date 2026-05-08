import TicketManagement from '../../../../components/TicketManagement';
import ProtectedRoute from '../../../../components/ProtectedRoute';

export default function AdminTicketsPage() {
  return (
    <ProtectedRoute allowedRoles={['ADMIN']}>
      <TicketManagement />
    </ProtectedRoute>
  );
}
