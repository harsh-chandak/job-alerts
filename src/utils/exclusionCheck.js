export function matchesConstraints(text) {
  const excludeKeywords = [
    // Seniority levels
    'sr',
    'senior',
    'principal',
    'staff',
    'lead',
    'expert',
    'seasoned',

    // Management & leadership
    'manager',
    'management',
    'director',
    'head',
    'vp',
    'vice president',
    'chief',
    'officer',
    'supervisor',
    'team lead',
    'project lead',
    'product lead',

    // High-experience / specialist roles
    'architect',
    'specialist',
    'consultant',
    'solutions engineer',
    'solution architect',
    'devops lead',
    'technical lead',

    // Years of experience
    '10+ years',
    '9+ years',
    '8+ years',
    '7+ years',
    '6+ years',
    '5+ years',
    'more than 5 years',
    'at least 5 years',
    'minimum 5 years',
    'proven track record',

    // Non-entry descriptors
    'highly experienced',
    'subject matter expert',
    'industry veteran'
  ];

  return !excludeKeywords.some(keyword => {
    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`\\b${escaped}\\b`, 'i').test(text);
  });
}