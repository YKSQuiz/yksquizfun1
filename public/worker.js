// Web Worker for background processing
self.onmessage = function(e) {
  const { type, data } = e.data;
  
  switch (type) {
    case 'CALCULATE_STATS':
      const stats = calculateStats(data);
      self.postMessage({ type: 'STATS_CALCULATED', data: stats });
      break;
      
    case 'PROCESS_QUESTIONS':
      const processedQuestions = processQuestions(data);
      self.postMessage({ type: 'QUESTIONS_PROCESSED', data: processedQuestions });
      break;
      
    case 'GENERATE_CHART_DATA':
      const chartData = generateChartData(data);
      self.postMessage({ type: 'CHART_DATA_GENERATED', data: chartData });
      break;
      
    default:
      console.log('Unknown message type:', type);
  }
};

function calculateStats(userData) {
  const { quizHistory, subjectStats } = userData;
  
  // Calculate total stats
  const totalStats = {
    totalQuizzes: quizHistory.length,
    totalQuestions: quizHistory.reduce((sum, quiz) => sum + quiz.totalQuestions, 0),
    totalCorrect: quizHistory.reduce((sum, quiz) => sum + quiz.correctAnswers, 0),
    averageScore: 0,
    bestScore: 0,
    totalTime: quizHistory.reduce((sum, quiz) => sum + (quiz.duration || 0), 0)
  };
  
  totalStats.averageScore = totalStats.totalQuestions > 0 
    ? (totalStats.totalCorrect / totalStats.totalQuestions) * 100 
    : 0;
    
  totalStats.bestScore = quizHistory.length > 0 
    ? Math.max(...quizHistory.map(quiz => (quiz.correctAnswers / quiz.totalQuestions) * 100))
    : 0;
  
  // Calculate subject-specific stats
  const subjectStatsCalculated = Object.keys(subjectStats).map(subjectId => {
    const stats = subjectStats[subjectId];
    return {
      subjectId,
      subjectName: stats.subjectName || subjectId,
      totalQuizzes: stats.totalQuizzes || 0,
      totalQuestions: stats.totalQuestions || 0,
      totalCorrect: stats.totalCorrect || 0,
      averageScore: stats.totalQuestions > 0 
        ? (stats.totalCorrect / stats.totalQuestions) * 100 
        : 0,
      bestScore: stats.bestScore || 0,
      totalTime: stats.totalTime || 0
    };
  });
  
  return {
    totalStats,
    subjectStats: subjectStatsCalculated
  };
}

function processQuestions(questions) {
  return questions.map(question => ({
    id: question.id,
    question: question.question,
    options: question.options,
    correctAnswer: question.correctAnswer,
    explanation: question.explanation,
    topicId: question.topicId,
    testNumber: question.testNumber,
    difficulty: calculateDifficulty(question),
    category: categorizeQuestion(question)
  }));
}

function calculateDifficulty(question) {
  // Simple difficulty calculation based on question length and complexity
  const questionLength = question.question.length;
  const optionsLength = question.options.reduce((sum, option) => sum + option.length, 0);
  
  if (questionLength > 200 || optionsLength > 400) return 'hard';
  if (questionLength > 100 || optionsLength > 200) return 'medium';
  return 'easy';
}

function categorizeQuestion(question) {
  // Categorize questions based on content
  const questionText = question.question.toLowerCase();
  
  if (questionText.includes('hesapla') || questionText.includes('formül')) return 'calculation';
  if (questionText.includes('tanım') || questionText.includes('açıkla')) return 'definition';
  if (questionText.includes('karşılaştır') || questionText.includes('fark')) return 'comparison';
  if (questionText.includes('sırala') || questionText.includes('düzenle')) return 'ordering';
  
  return 'general';
}

function generateChartData(data) {
  const { quizHistory, timeFilter } = data;
  
  // Group by time period
  const groupedData = groupByTimePeriod(quizHistory, timeFilter);
  
  // Calculate daily/weekly/monthly stats
  return Object.keys(groupedData).map(period => {
    const quizzes = groupedData[period];
    const totalCorrect = quizzes.reduce((sum, quiz) => sum + quiz.correctAnswers, 0);
    const totalQuestions = quizzes.reduce((sum, quiz) => sum + quiz.totalQuestions, 0);
    const successRate = totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0;
    
    return {
      date: period,
      correct: totalCorrect,
      incorrect: totalQuestions - totalCorrect,
      successRate: Math.round(successRate),
      totalQuizzes: quizzes.length
    };
  }).sort((a, b) => new Date(a.date) - new Date(b.date));
}

function groupByTimePeriod(quizHistory, timeFilter) {
  const grouped = {};
  
  quizHistory.forEach(quiz => {
    const date = new Date(quiz.timestamp || quiz.date);
    let period;
    
    switch (timeFilter) {
      case 'daily':
        period = date.toISOString().split('T')[0];
        break;
      case 'weekly':
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        period = weekStart.toISOString().split('T')[0];
        break;
      case 'monthly':
        period = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        break;
      default:
        period = date.toISOString().split('T')[0];
    }
    
    if (!grouped[period]) {
      grouped[period] = [];
    }
    grouped[period].push(quiz);
  });
  
  return grouped;
}
