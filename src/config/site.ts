export const siteConfig = {
  name: "CertifiTrack",
  domain: "certifitrack.com", 
  url: "https://certifitrack.com", 
  defaultLocale: "en",
  // Analytics & Tracking (TODO: CONFIGURE BEFORE LAUNCH)
  // CertifiTrack currently uses no default analytics provider to respect privacy.
  // When a provider (e.g., Google Analytics, Plausible) is selected, configure the ID below.
  analyticsId: "", // e.g., "G-XXXXXXXXXX"
  
  // TODO: LAUNCH BLOCKERS - MUST BE CONFIGURED BEFORE PRODUCTION
  stripePaymentLink25: "https://buy.stripe.com/test_placeholder_25",
  stripePaymentLink100: "https://buy.stripe.com/test_placeholder_100",
  uploadFormUrl: "https://tally.so/r/placeholder",
  
  // Contact
  supportEmail: "support@certifitrack.com",

  // Legal & Trust Variables (TODO: LAUNCH BLOCKERS - CONFIRM FACTS)
  legalEntityName: "[CONFIRM LEGAL ENTITY]", // Do not invent (e.g. CertifiTrack LLC)
  governingLaw: "[CONFIRM JURISDICTION]", // Do not invent (e.g. Delaware)
  dataRetention: "[CONFIRM RETENTION PERIOD]", // Do not invent (e.g. 30 days)
  aiTrainingPolicy: "[CONFIRM AI TRAINING POLICY]", // Do not invent (e.g. we do not use your data to train AI)
  
  socials: {
    twitter: "https://twitter.com/certifitrack",
    linkedin: "https://linkedin.com/company/certifitrack"
  }
};
