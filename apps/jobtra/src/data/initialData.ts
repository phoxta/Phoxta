import { JobApplication, EmailScanResult, ConnectedAccount, BaseCV } from '../types';

export const INITIAL_BASE_CVS: BaseCV[] = [
  {
    id: 'cv-frontend-lead',
    title: 'Senior Software & Frontend Engineer',
    targetRole: 'Senior / Staff Software Engineer',
    fullName: 'Oluwafemi Adeyemi',
    email: 'adeyemioluwafemi2018@gmail.com',
    phone: '+1 (555) 382-9901',
    location: 'Remote / Hybrid',
    linkedin: 'https://linkedin.com/in/adeyemi-oluwafemi',
    portfolio: 'https://github.com/adeyemioluwafemi2018',
    github: 'https://github.com/adeyemioluwafemi2018',
    isDefault: true,
    summary: 'Senior Software Engineer with deep experience building reactive web applications, real-time sync systems, scalable TypeScript/React architectures, and modern cloud/AI workflows.',
    skills: [
      {
        category: 'Frontend & UI Systems',
        items: ['React 19', 'TypeScript', 'Next.js', 'Tailwind CSS', 'GraphQL', 'WebSockets', 'State Machines']
      },
      {
        category: 'Architecture & Cloud',
        items: ['Cloud Architecture', 'Performance Profiling', 'Design Systems', 'Firestore', 'Node.js', 'CI/CD', 'Docker']
      }
    ],
    experience: [
      {
        id: 'exp-1',
        company: 'Technology Systems',
        role: 'Senior Software Engineer',
        location: 'Remote',
        startDate: '2022-01',
        endDate: 'Present',
        isCurrent: true,
        bullets: [
          'Architected responsive, real-time collaborative workspace serving high-volume users with sub-16ms frame render times.',
          'Engineered resilient offline-first caching layer and cloud synchronization reducing latency by 44%.',
          'Spearheaded design system unification and component architecture across multiple product suites.'
        ],
        techStack: ['React', 'TypeScript', 'Tailwind CSS', 'Firestore', 'WebSockets']
      }
    ],
    education: [
      {
        id: 'edu-1',
        institution: 'University of Lagos / Tech Institute',
        degree: 'B.Sc. in Computer Science',
        graduationYear: '2019',
        details: 'Software Engineering & Distributed Systems'
      }
    ],
    certifications: [
      'AWS Certified Solutions Architect Associate',
      'Google Cloud Certified Professional Cloud Developer'
    ],
    createdAt: '2026-08-01T10:00:00.000Z',
    updatedAt: '2026-08-25T14:30:00.000Z'
  }
];

// No seeded/dummy account — a Gmail appears here only after it's connected via
// OAuth (Email Sync Hub → Connect Gmail).
export const INITIAL_CONNECTED_ACCOUNTS: ConnectedAccount[] = [];

export const INITIAL_APPLICATIONS: JobApplication[] = [];

export const DEMO_INCOMING_EMAILS: EmailScanResult[] = [];
