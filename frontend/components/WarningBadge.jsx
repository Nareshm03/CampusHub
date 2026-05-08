const WarningBadge = ({ status, text }) => {
  const getBadgeClass = () => {
    switch (status) {
      case 'SAFE':
      case 'APPROVED':
        return 'badge badge-success';
      case 'WARNING':
      case 'PENDING':
        return 'badge badge-warning';
      case 'SHORTAGE':
      case 'AT_RISK':
      case 'REJECTED':
        return 'badge badge-danger';
      default:
        return 'badge';
    }
  };

  return (
    <span className={getBadgeClass()}>
      {text || status}
    </span>
  );
};

export default WarningBadge;