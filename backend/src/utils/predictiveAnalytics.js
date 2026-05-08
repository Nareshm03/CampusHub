/**
 * Predictive Analytics Utility
 * Uses statistical methods and simple ML algorithms for performance prediction
 */

/**
 * Calculate linear regression for trend prediction
 */
function linearRegression(data) {
  const n = data.length;
  if (n === 0) return { slope: 0, intercept: 0, rSquared: 0 };

  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  
  data.forEach((point, index) => {
    const x = index;
    const y = point.value;
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumXX += x * x;
  });

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  // Calculate R-squared
  const yMean = sumY / n;
  let ssTotal = 0, ssResidual = 0;
  
  data.forEach((point, index) => {
    const predicted = slope * index + intercept;
    ssTotal += Math.pow(point.value - yMean, 2);
    ssResidual += Math.pow(point.value - predicted, 2);
  });

  const rSquared = 1 - (ssResidual / ssTotal);

  return { slope, intercept, rSquared };
}

/**
 * Predict future performance based on historical data
 */
function predictPerformance(historicalData, periodsAhead = 1) {
  if (!historicalData || historicalData.length < 2) {
    return { prediction: null, confidence: 0, trend: 'insufficient_data' };
  }

  const regression = linearRegression(historicalData);
  const nextIndex = historicalData.length;
  const prediction = regression.slope * (nextIndex + periodsAhead - 1) + regression.intercept;

  // Determine trend
  let trend = 'stable';
  if (regression.slope > 2) trend = 'improving';
  else if (regression.slope < -2) trend = 'declining';

  // Confidence based on R-squared
  const confidence = Math.min(100, Math.max(0, regression.rSquared * 100));

  return {
    prediction: Math.max(0, Math.min(100, prediction)),
    confidence,
    trend,
    slope: regression.slope,
    rSquared: regression.rSquared
  };
}

/**
 * Calculate moving average for smoothing
 */
function movingAverage(data, windowSize = 3) {
  if (data.length < windowSize) return data;

  const result = [];
  for (let i = 0; i < data.length; i++) {
    if (i < windowSize - 1) {
      result.push(data[i]);
    } else {
      const window = data.slice(i - windowSize + 1, i + 1);
      const avg = window.reduce((sum, val) => sum + val.value, 0) / windowSize;
      result.push({ ...data[i], smoothed: avg });
    }
  }

  return result;
}

/**
 * Analyze correlation between two datasets
 */
function calculateCorrelation(dataX, dataY) {
  if (!dataX || !dataY || dataX.length !== dataY.length || dataX.length === 0) {
    return { correlation: 0, strength: 'none', relationship: 'none' };
  }

  const n = dataX.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0, sumYY = 0;

  for (let i = 0; i < n; i++) {
    const x = dataX[i];
    const y = dataY[i];
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumXX += x * x;
    sumYY += y * y;
  }

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY));

  const correlation = denominator === 0 ? 0 : numerator / denominator;

  // Determine strength
  const absCorr = Math.abs(correlation);
  let strength = 'none';
  if (absCorr >= 0.7) strength = 'strong';
  else if (absCorr >= 0.4) strength = 'moderate';
  else if (absCorr >= 0.2) strength = 'weak';

  // Determine relationship
  let relationship = 'none';
  if (correlation > 0.2) relationship = 'positive';
  else if (correlation < -0.2) relationship = 'negative';

  return {
    correlation: Math.round(correlation * 1000) / 1000,
    strength,
    relationship
  };
}

/**
 * Predict risk level based on multiple factors
 */
function assessRiskLevel(studentData) {
  const {
    currentGrade = 0,
    attendanceRate = 0,
    assignmentCompletion = 0,
    trendSlope = 0,
    previousGrades = []
  } = studentData;

  let riskScore = 0;

  // Grade-based risk
  if (currentGrade < 40) riskScore += 40;
  else if (currentGrade < 60) riskScore += 25;
  else if (currentGrade < 75) riskScore += 10;

  // Attendance-based risk
  if (attendanceRate < 50) riskScore += 30;
  else if (attendanceRate < 70) riskScore += 20;
  else if (attendanceRate < 85) riskScore += 10;

  // Assignment completion risk
  if (assignmentCompletion < 50) riskScore += 20;
  else if (assignmentCompletion < 75) riskScore += 10;

  // Trend-based risk
  if (trendSlope < -3) riskScore += 10;

  // Consistency risk (standard deviation of grades)
  if (previousGrades.length >= 3) {
    const mean = previousGrades.reduce((a, b) => a + b, 0) / previousGrades.length;
    const variance = previousGrades.reduce((sum, grade) => sum + Math.pow(grade - mean, 2), 0) / previousGrades.length;
    const stdDev = Math.sqrt(variance);
    
    if (stdDev > 15) riskScore += 10;
  }

  // Determine risk level
  let riskLevel = 'low';
  let intervention = 'Monitor progress';
  
  if (riskScore >= 70) {
    riskLevel = 'critical';
    intervention = 'Immediate intervention required';
  } else if (riskScore >= 50) {
    riskLevel = 'high';
    intervention = 'Schedule counseling session';
  } else if (riskScore >= 30) {
    riskLevel = 'medium';
    intervention = 'Provide additional support';
  }

  return {
    riskScore: Math.min(100, riskScore),
    riskLevel,
    intervention,
    factors: {
      gradeRisk: currentGrade < 60,
      attendanceRisk: attendanceRate < 75,
      assignmentRisk: assignmentCompletion < 75,
      trendRisk: trendSlope < -2
    }
  };
}

/**
 * Generate performance insights
 */
function generateInsights(studentData) {
  const insights = [];

  const {
    grades = [],
    attendance = [],
    trend,
    correlation,
    riskLevel
  } = studentData;

  // Trend insights
  if (trend === 'improving') {
    insights.push({
      type: 'positive',
      message: 'Performance is improving over time',
      recommendation: 'Continue current study methods'
    });
  } else if (trend === 'declining') {
    insights.push({
      type: 'warning',
      message: 'Performance is declining',
      recommendation: 'Review study habits and seek help'
    });
  }

  // Correlation insights
  if (correlation && correlation.relationship === 'positive' && correlation.strength !== 'none') {
    insights.push({
      type: 'info',
      message: `${correlation.strength} positive correlation between attendance and performance`,
      recommendation: 'Maintain regular attendance to improve grades'
    });
  }

  // Risk insights
  if (riskLevel && riskLevel.riskLevel !== 'low') {
    insights.push({
      type: 'alert',
      message: `${riskLevel.riskLevel} risk level detected`,
      recommendation: riskLevel.intervention
    });
  }

  // Recent performance
  if (grades.length >= 2) {
    const recentGrades = grades.slice(-2);
    const improvement = recentGrades[1].value - recentGrades[0].value;
    
    if (improvement > 10) {
      insights.push({
        type: 'positive',
        message: 'Significant improvement in recent performance',
        recommendation: 'Keep up the excellent work'
      });
    } else if (improvement < -10) {
      insights.push({
        type: 'warning',
        message: 'Recent performance decline detected',
        recommendation: 'Review recent topics and seek clarification'
      });
    }
  }

  return insights;
}

/**
 * Calculate percentile rank
 */
function calculatePercentile(value, dataset) {
  if (!dataset || dataset.length === 0) return 0;
  
  const sorted = [...dataset].sort((a, b) => a - b);
  const belowCount = sorted.filter(v => v < value).length;
  
  return Math.round((belowCount / sorted.length) * 100);
}

/**
 * Identify weak subjects for intervention
 */
function identifyWeakSubjects(subjectPerformance, threshold = 60) {
  return subjectPerformance
    .filter(subject => subject.average < threshold)
    .sort((a, b) => a.average - b.average)
    .map(subject => ({
      subject: subject.name,
      average: subject.average,
      gap: threshold - subject.average,
      priority: subject.average < 40 ? 'high' : subject.average < 50 ? 'medium' : 'low'
    }));
}

module.exports = {
  linearRegression,
  predictPerformance,
  movingAverage,
  calculateCorrelation,
  assessRiskLevel,
  generateInsights,
  calculatePercentile,
  identifyWeakSubjects
};
