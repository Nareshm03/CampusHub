'use client';

/**
 * Chart Components using pure CSS and SVG
 * No external chart library dependencies
 */

export function LineChart({ data, height = 300, showGrid = true, xLabel = '', yLabel = '' }) {
  if (!data || data.length === 0) {
    return <div className="text-center text-gray-500 py-8">No data available</div>;
  }

  if (data.length === 1) {
    return (
      <div className="text-center text-gray-500 py-8">
        <div className="text-2xl font-bold">{data[0].value}</div>
        <div className="text-sm mt-1">{data[0].label}</div>
      </div>
    );
  }

  const sanitizedData = data.map(item => ({
    ...item,
    value: isNaN(Number(item.value)) ? 0 : Number(item.value)
  }));

  const maxValue = Math.max(...sanitizedData.map(d => d.value));
  const minValue = Math.min(...sanitizedData.map(d => d.value));
  const range = maxValue - minValue || 1;
  const padding = 40;
  const width = 600;

  const points = sanitizedData.map((d, i) => {
    const x = padding + (i / (sanitizedData.length - 1 || 1)) * (width - padding * 2);
    const y = height - padding - ((d.value - minValue) / range) * (height - padding * 2);
    return { x, y, label: d.label, value: d.value };
  });

  const pathData = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  return (
    <div className="w-full">
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
        {/* Grid lines */}
        {showGrid && (
          <g className="text-gray-300">
            {[0, 25, 50, 75, 100].map(val => {
              const y = height - padding - (val / 100) * (height - padding * 2);
              return (
                <g key={val}>
                  <line
                    x1={padding}
                    y1={y}
                    x2={width - padding}
                    y2={y}
                    stroke="currentColor"
                    strokeWidth="0.5"
                    opacity="0.3"
                  />
                  <text x={padding - 10} y={y + 4} textAnchor="end" fontSize="12" fill="currentColor">
                    {Math.round(minValue + (val / 100) * range)}
                  </text>
                </g>
              );
            })}
          </g>
        )}

        {/* Axis */}
        <line
          x1={padding}
          y1={height - padding}
          x2={width - padding}
          y2={height - padding}
          stroke="#333"
          strokeWidth="2"
        />
        <line
          x1={padding}
          y1={padding}
          x2={padding}
          y2={height - padding}
          stroke="#333"
          strokeWidth="2"
        />

        {/* Line */}
        <path
          d={pathData}
          fill="none"
          stroke="#3b82f6"
          strokeWidth="3"
          strokeLinejoin="round"
        />

        {/* Area under line */}
        <path
          d={`${pathData} L ${points[points.length - 1].x} ${height - padding} L ${padding} ${height - padding} Z`}
          fill="url(#lineGradient)"
          opacity="0.2"
        />

        {/* Gradient */}
        <defs>
          <linearGradient id="lineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Points */}
        {points.map((point, i) => (
          <g key={i}>
            <circle cx={point.x} cy={point.y} r="5" fill="#3b82f6" stroke="white" strokeWidth="2" />
            <text
              x={point.x}
              y={height - padding + 20}
              textAnchor="middle"
              fontSize="11"
              fill="#666"
            >
              {point.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

export function BarChart({ data, height = 300, color = '#3b82f6' }) {
  if (!data || data.length === 0) {
    return <div className="text-center text-gray-500 py-8">No data available</div>;
  }

  const sanitizedData = data.map(item => ({
    ...item,
    value: isNaN(Number(item.value)) ? 0 : Number(item.value)
  }));

  const maxValue = Math.max(...sanitizedData.map(d => d.value));
  const effectiveMax = maxValue <= 0 ? 1 : maxValue;
  const padding = 40;
  const barWidth = Math.max(1, (600 - padding * 2) / sanitizedData.length - 10);

  return (
    <div className="w-full">
      <svg width="100%" height={height} viewBox={`0 0 600 ${height}`}>
        {/* Axis */}
        <line
          x1={padding}
          y1={height - padding}
          x2={600 - padding}
          y2={height - padding}
          stroke="#333"
          strokeWidth="2"
        />

        {/* Bars */}
        {sanitizedData.map((item, i) => {
          const barHeight = ((item.value / effectiveMax) * (height - padding * 2));
          const x = padding + i * (barWidth + 10);
          const y = height - padding - barHeight;

          return (
            <g key={i}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                fill={color}
                opacity="0.8"
                rx="4"
              />
              <text
                x={x + barWidth / 2}
                y={y - 5}
                textAnchor="middle"
                fontSize="12"
                fontWeight="bold"
                fill="#333"
              >
                {Math.round(item.value)}
              </text>
              <text
                x={x + barWidth / 2}
                y={height - padding + 20}
                textAnchor="middle"
                fontSize="11"
                fill="#666"
              >
                {item.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export function PieChart({ data, size = 200 }) {
  if (!data || data.length === 0) {
    return <div className="text-center text-gray-500 py-8">No data available</div>;
  }

  const sanitizedData = data.map(item => ({
    ...item,
    value: isNaN(Number(item.value)) ? 0 : Number(item.value)
  }));

  const total = sanitizedData.reduce((sum, d) => sum + d.value, 0) || 1;
  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
  
  let currentAngle = -90;
  const segments = sanitizedData.map((item, i) => {
    const percentage = (item.value / total) * 100;
    const angle = (item.value / total) * 360;
    const startAngle = currentAngle;
    currentAngle += angle;

    const start = polarToCartesian(size / 2, size / 2, size / 2 - 20, startAngle);
    const end = polarToCartesian(size / 2, size / 2, size / 2 - 20, currentAngle);
    const largeArc = angle > 180 ? 1 : 0;

    const path = [
      `M ${size / 2} ${size / 2}`,
      `L ${start.x} ${start.y}`,
      `A ${size / 2 - 20} ${size / 2 - 20} 0 ${largeArc} 1 ${end.x} ${end.y}`,
      'Z'
    ].join(' ');

    return { path, color: colors[i % colors.length], label: item.label, percentage };
  });

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size}>
        {segments.map((seg, i) => (
          <path key={i} d={seg.path} fill={seg.color} opacity="0.9" stroke="white" strokeWidth="2" />
        ))}
        <circle cx={size / 2} cy={size / 2} r={size / 2 - 80} fill="white" />
      </svg>
      <div className="mt-4 space-y-1">
        {segments.map((seg, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: seg.color }} />
            <span>{seg.label}: {seg.percentage.toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function RadarChart({ data, size = 300 }) {
  if (!data || data.length === 0) {
    return <div className="text-center text-gray-500 py-8">No data available</div>;
  }

  const sanitizedData = data.map(item => ({
    ...item,
    value: isNaN(Number(item.value)) ? 0 : Number(item.value)
  }));

  const center = size / 2;
  const radius = size / 2 - 40;
  const maxValue = 100;
  const angleStep = (2 * Math.PI) / sanitizedData.length;

  const points = sanitizedData.map((item, i) => {
    const angle = i * angleStep - Math.PI / 2;
    const r = (item.value / maxValue) * radius;
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle),
      label: item.label,
      value: item.value,
      angle
    };
  });

  const pathData = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';

  // Grid circles
  const gridLevels = [20, 40, 60, 80, 100];

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size}>
        {/* Grid circles */}
        {gridLevels.map(level => (
          <circle
            key={level}
            cx={center}
            cy={center}
            r={(level / 100) * radius}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="1"
          />
        ))}

        {/* Axis lines */}
        {points.map((point, i) => (
          <line
            key={i}
            x1={center}
            y1={center}
            x2={center + radius * Math.cos(point.angle)}
            y2={center + radius * Math.sin(point.angle)}
            stroke="#e5e7eb"
            strokeWidth="1"
          />
        ))}

        {/* Data area */}
        <path d={pathData} fill="#3b82f6" opacity="0.3" stroke="#3b82f6" strokeWidth="2" />

        {/* Data points */}
        {points.map((point, i) => (
          <g key={i}>
            <circle cx={point.x} cy={point.y} r="4" fill="#3b82f6" stroke="white" strokeWidth="2" />
            <text
              x={center + (radius + 25) * Math.cos(point.angle)}
              y={center + (radius + 25) * Math.sin(point.angle)}
              textAnchor="middle"
              fontSize="11"
              fill="#666"
            >
              {point.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

export function ProgressRing({ percentage, size = 120, strokeWidth = 12, color = '#3b82f6' }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const safePercentage = isNaN(Number(percentage)) ? 0 : Math.min(100, Math.max(0, Number(percentage)));
  const offset = circumference - (safePercentage / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size}>
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="absolute text-center">
        <div className="text-2xl font-bold">{Math.round(safePercentage)}%</div>
      </div>
    </div>
  );
}

export function ScatterPlot({ data, width = 500, height = 300, xLabel, yLabel }) {
  if (!data || data.length === 0) {
    return <div className="text-center text-gray-500 py-8">No data available</div>;
  }

  const sanitizedData = data.map(item => ({
    ...item,
    x: isNaN(Number(item.x)) ? 0 : Number(item.x),
    y: isNaN(Number(item.y)) ? 0 : Number(item.y)
  }));

  const padding = 50;
  const maxX = Math.max(...sanitizedData.map(d => d.x));
  const maxY = Math.max(...sanitizedData.map(d => d.y));
  const minX = Math.min(...sanitizedData.map(d => d.x));
  const minY = Math.min(...sanitizedData.map(d => d.y));

  const scaleX = (x) => padding + ((x - minX) / (maxX - minX || 1)) * (width - padding * 2);
  const scaleY = (y) => height - padding - ((y - minY) / (maxY - minY || 1)) * (height - padding * 2);

  return (
    <div className="w-full">
      <svg width={width} height={height}>
        {/* Axes */}
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#333" strokeWidth="2" />
        <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#333" strokeWidth="2" />

        {/* Data points */}
        {sanitizedData.map((point, i) => (
          <circle
            key={i}
            cx={scaleX(point.x)}
            cy={scaleY(point.y)}
            r="5"
            fill="#3b82f6"
            opacity="0.7"
          />
        ))}

        {/* Labels */}
        {xLabel && (
          <text x={width / 2} y={height - 10} textAnchor="middle" fontSize="12" fill="#666">
            {xLabel}
          </text>
        )}
        {yLabel && (
          <text
            x={15}
            y={height / 2}
            textAnchor="middle"
            fontSize="12"
            fill="#666"
            transform={`rotate(-90, 15, ${height / 2})`}
          >
            {yLabel}
          </text>
        )}
      </svg>
    </div>
  );
}

// Helper function
function polarToCartesian(centerX, centerY, radius, angleInDegrees) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians)
  };
}
