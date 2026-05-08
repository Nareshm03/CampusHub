/**
 * Plagiarism Detection Utility
 * Uses text similarity algorithms to detect potential plagiarism
 */

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1, str2) {
  const matrix = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

/**
 * Calculate similarity percentage between two strings
 */
function calculateSimilarity(str1, str2) {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) {
    return 100.0;
  }
  
  const distance = levenshteinDistance(longer, shorter);
  return ((longer.length - distance) / longer.length) * 100;
}

/**
 * Normalize text for comparison
 */
function normalizeText(text) {
  if (!text) return '';
  
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extract n-grams from text
 */
function extractNGrams(text, n = 3) {
  const words = text.split(' ');
  const ngrams = [];
  
  for (let i = 0; i <= words.length - n; i++) {
    ngrams.push(words.slice(i, i + n).join(' '));
  }
  
  return ngrams;
}

/**
 * Calculate Jaccard similarity between two sets
 */
function jaccardSimilarity(set1, set2) {
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  
  if (union.size === 0) return 0;
  return (intersection.size / union.size) * 100;
}

/**
 * Find common segments between two texts
 */
function findCommonSegments(text1, text2, minLength = 50) {
  const segments = [];
  const normalized1 = normalizeText(text1);
  const normalized2 = normalizeText(text2);
  
  const words1 = normalized1.split(' ');
  const words2 = normalized2.split(' ');
  
  for (let i = 0; i < words1.length; i++) {
    for (let j = 0; j < words2.length; j++) {
      let k = 0;
      while (
        i + k < words1.length &&
        j + k < words2.length &&
        words1[i + k] === words2[j + k]
      ) {
        k++;
      }
      
      if (k >= Math.ceil(minLength / 5)) {
        const segment = words1.slice(i, i + k).join(' ');
        if (segment.length >= minLength) {
          segments.push({
            text: segment,
            position: i,
            length: k
          });
        }
      }
    }
  }
  
  return segments;
}

/**
 * Compare two texts and return similarity score with details
 */
function compareTexts(text1, text2, options = {}) {
  const {
    useNGrams = true,
    ngramSize = 3,
    useLevenshtein = true,
    findSegments = true,
    minSegmentLength = 50
  } = options;
  
  const normalized1 = normalizeText(text1);
  const normalized2 = normalizeText(text2);
  
  let scores = [];
  
  // N-gram based similarity
  if (useNGrams) {
    const ngrams1 = new Set(extractNGrams(normalized1, ngramSize));
    const ngrams2 = new Set(extractNGrams(normalized2, ngramSize));
    const ngramScore = jaccardSimilarity(ngrams1, ngrams2);
    scores.push(ngramScore);
  }
  
  // Levenshtein-based similarity
  if (useLevenshtein) {
    const levScore = calculateSimilarity(normalized1, normalized2);
    scores.push(levScore);
  }
  
  // Calculate average score
  const similarityScore = scores.length > 0
    ? scores.reduce((a, b) => a + b, 0) / scores.length
    : 0;
  
  // Find common segments
  const segments = findSegments
    ? findCommonSegments(text1, text2, minSegmentLength)
    : [];
  
  return {
    similarityScore: Math.round(similarityScore * 100) / 100,
    matchedSegments: segments,
    details: {
      ngramScore: scores[0] || 0,
      levenshteinScore: scores[1] || 0
    }
  };
}

/**
 * Check a submission against all other submissions
 */
async function checkPlagiarism(submission, allSubmissions, threshold = 30) {
  const results = [];
  
  if (!submission.textContent) {
    return {
      overallScore: 0,
      matches: [],
      isPlagiarized: false
    };
  }
  
  for (const otherSubmission of allSubmissions) {
    // Skip if same submission
    if (otherSubmission._id.toString() === submission._id.toString()) {
      continue;
    }
    
    if (!otherSubmission.textContent) {
      continue;
    }
    
    const comparison = compareTexts(
      submission.textContent,
      otherSubmission.textContent,
      {
        useNGrams: true,
        ngramSize: 3,
        useLevenshtein: true,
        findSegments: true,
        minSegmentLength: 30
      }
    );
    
    if (comparison.similarityScore >= threshold) {
      results.push({
        matchedWith: otherSubmission._id,
        student: otherSubmission.student,
        similarityScore: comparison.similarityScore,
        matchedSegments: comparison.matchedSegments.slice(0, 5) // Limit to top 5
      });
    }
  }
  
  // Sort by similarity score descending
  results.sort((a, b) => b.similarityScore - a.similarityScore);
  
  const overallScore = results.length > 0
    ? results[0].similarityScore
    : 0;
  
  return {
    overallScore,
    matches: results,
    isPlagiarized: overallScore >= threshold
  };
}

module.exports = {
  compareTexts,
  checkPlagiarism,
  normalizeText,
  calculateSimilarity,
  findCommonSegments
};
