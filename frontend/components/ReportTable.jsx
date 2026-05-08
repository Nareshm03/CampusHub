import Card from './ui/Card';
import Button from './ui/Button';

export default function ReportTable({ title, data, columns, stats, onDownload, getRowClass }) {
  return (
    <Card className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{title}</h2>
          {stats && (
            <div className="flex gap-4 mt-2 text-sm text-gray-600 dark:text-gray-400">
              {stats.map((stat, idx) => (
                <span key={idx}>{stat.label}: <strong>{stat.value}</strong></span>
              ))}
            </div>
          )}
        </div>
        <Button onClick={onDownload} variant="outline">Download CSV</Button>
      </div>
      
      {data.length === 0 ? (
        <p className="text-center text-gray-500 dark:text-gray-400 py-8">No data available</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                {columns.map((col) => (
                  <th key={col.key} className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, idx) => (
                <tr key={idx} className={`border-b border-gray-100 dark:border-gray-800 ${getRowClass?.(row) || ''}`}>
                  {columns.map((col) => (
                    <td key={col.key} className="py-3 px-4 text-gray-700 dark:text-gray-300">
                      {col.render ? col.render(row[col.key], row) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}