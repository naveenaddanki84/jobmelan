
import { JobPosting } from "@/types";

const COMPANIES = [
  "Google", "Microsoft", "Stripe", "Airbnb", "Netflix", "Vercel", "OpenAI", "Anthropic", "Linear", "Notion", "Shopify", "Amazon", "Meta", "Datadog"
];

const TITLES = [
  "Senior Frontend Engineer", "Full Stack Developer", "AI Research Scientist", "Product Designer", 
  "Machine Learning Engineer", "DevOps Specialist", "React Native Developer", "Staff Software Engineer",
  "Founding Engineer", "VP of Engineering", "Data Scientist", "Cloud Architect"
];

const LOCATIONS = [
  "San Francisco, CA", "New York, NY", "Remote", "Austin, TX", "Seattle, WA", "London, UK", "Berlin, DE", "Toronto, CA"
];

const TAGS = [
  "Be an early applicant", "H1B Sponsor", "Fast response", "Urgent Hire", "Alumni work here", "Top Rated", "Series B", "Y Combinator"
];

const DESCRIPTIONS = [
  "We are looking for a talented engineer to join our world-class team. You will be responsible for building scalable systems and shipping features to millions of users.",
  "Join a fast-paced startup environment where you will have ownership over the entire stack. We are looking for builders who love to ship.",
  "As a core member of the team, you will work directly with the founders to shape the product direction and engineering culture.",
  "We are seeking a specialist to help us scale our AI infrastructure. Experience with Python, PyTorch, and Kubernetes is a must."
];

export const generateMockJobs = (count: number = 10): JobPosting[] => {
  return Array.from({ length: count }).map((_, i) => generateSingleJob());
};

export const generateSingleJob = (): JobPosting => {
  const company = COMPANIES[Math.floor(Math.random() * COMPANIES.length)];
  const title = TITLES[Math.floor(Math.random() * TITLES.length)];
  
  // Generate a realistic looking salary
  const min = 120 + Math.floor(Math.random() * 80);
  const max = min + 30 + Math.floor(Math.random() * 40);
  
  // Generate random score skewed high for "demo" effect
  const score = 60 + Math.floor(Math.random() * 35); 
  
  return {
    id: crypto.randomUUID(),
    company,
    title,
    location: LOCATIONS[Math.floor(Math.random() * LOCATIONS.length)],
    type: Math.random() > 0.2 ? "Full-time" : "Contract",
    salary: `$${min}k - $${max}k/yr`,
    postedAt: "Just now",
    description: DESCRIPTIONS[Math.floor(Math.random() * DESCRIPTIONS.length)],
    url: "#",
    tags: [
      Math.random() > 0.5 ? "Remote" : "On-site",
      TAGS[Math.floor(Math.random() * TAGS.length)]
    ],
    matchScore: score,
    logo: `https://ui-avatars.com/api/?name=${company}&background=random&color=fff&size=128`,
    requirements: [
      "3+ years of experience with React and TypeScript",
      "Experience with server-side rendering (Next.js)",
      "Strong understanding of web performance and accessibility",
      "Ability to work in a fast-paced environment"
    ]
  };
};

export const searchJobsMock = async (query: string): Promise<JobPosting[]> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 600));
  
  const allJobs = generateMockJobs(15);
  
  if (!query) return allJobs;
  
  const lowerQuery = query.toLowerCase();
  return allJobs.filter(job => 
    job.title.toLowerCase().includes(lowerQuery) || 
    job.company.toLowerCase().includes(lowerQuery)
  );
};

