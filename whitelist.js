// WHITELISTED DOMAINS - These contain ad/track patterns but are legitimate
const WHITELISTED_DOMAINS = [
  'github.com',
  'stackoverflow.com',
  'reddit.com',
  'wikipedia.org',
  'youtube.com',
  'google.com',
  'microsoft.com',
  'apple.com',
  'mozilla.org',
  'chromium.org',
  'nodejs.org',
  'npmjs.com',
  'cloudflare.com',
  'fastly.com',
  'jsdelivr.net',
  'unpkg.com',
  'cdnjs.cloudflare.com',
  'gravatar.com',
  'wordpress.org',
  'medium.com'
];

// Enhanced blocking function with whitelist check
async function shouldBlockDomain(domain) {
  try {
    // Check if domain is whitelisted
    for (const whitelisted of WHITELISTED_DOMAINS) {
      if (domain.includes(whitelisted)) {
        return false;
      }
    }
    
    // Block patterns for ad/tracking domains
    const blockPatterns = [
      /ad[^/]*\./i,
      /ads[^/]*\./i,
      /track[^/]*\./i,
      /tracker[^/]*\./i,
      /tracking[^/]*\./i,
      /analytic[^/]*\./i,
      /pixel[^/]*\./i,
      /serving[^/]*\./i,
      /delivery[^/]*\./i,
      /network[^/]*\./i,
      /exchange[^/]*\./i,
      /market[^/]*\./i,
      /media[^/]*\./i,
      /stat[^/]*\./i,
      /metric[^/]*\./i,
      /beacon[^/]*\./i,
      /tag[^/]*\./i,
      /sync[^/]*\./i,
      /log[^/]*\./i,
      /collector[^/]*\./i
    ];
    
    return blockPatterns.some(pattern => pattern.test(domain));
  } catch (error) {
    console.error('Error checking domain:', error);
    return false;
  }
}

console.log('🛡️ Enhanced blocking rules loaded with whitelist protection');
console.log(`📋 Whitelisted domains: ${WHITELISTED_DOMAINS.length}`);