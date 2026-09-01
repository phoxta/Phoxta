import { BaseCV } from '../types';

export const INITIAL_BASE_CVS: BaseCV[] = [
  {
    id: 'cv-fullstack-base',
    title: 'Senior Full-Stack Engineer (Core Base)',
    targetRole: 'Senior Full-Stack Engineer / Lead',
    fullName: 'Alex Morgan',
    email: 'alex.morgan.dev@gmail.com',
    phone: '+1 (555) 382-9104',
    location: 'San Francisco, CA (Open to Remote)',
    linkedin: 'https://linkedin.com/in/alex-morgan-tech',
    github: 'https://github.com/alexmorgan-dev',
    portfolio: 'https://alexmorgan.io',
    summary: 'High-impact Senior Full-Stack Engineer with 7+ years of experience architecting distributed cloud applications, resilient microservices, and reactive web applications. Proven track record leading cross-functional teams, reducing API latencies by 45%, and scaling user platforms to 2M+ MAU with React, TypeScript, Node.js, and GCP/AWS.',
    isDefault: true,
    skills: [
      {
        category: 'Frontend & UI',
        items: ['TypeScript', 'React 18/19', 'Next.js', 'Tailwind CSS', 'Redux / Zustand', 'Vite', 'GraphQL Client', 'WebSockets', 'Web Performance & Core Web Vitals']
      },
      {
        category: 'Backend & APIs',
        items: ['Node.js', 'Express', 'NestJS', 'PostgreSQL', 'Prisma / Drizzle ORM', 'Redis', 'RESTful API Design', 'GraphQL Apollo', 'Python / FastAPI']
      },
      {
        category: 'Cloud & DevOps',
        items: ['AWS (ECS, Lambda, S3, RDS)', 'GCP (Cloud Run, Spanner)', 'Docker', 'Kubernetes', 'CI/CD (GitHub Actions)', 'Terraform', 'Datadog']
      },
      {
        category: 'Architecture & Practices',
        items: ['Microservices', 'Event-Driven Systems (Kafka)', 'System Design', 'TDD (Jest, Playwright)', 'Agile / Scrum Leadership', 'Security & OAuth2']
      }
    ],
    experience: [
      {
        id: 'exp-1',
        company: 'Vanguard Cloud Solutions',
        role: 'Senior Full-Stack Engineer & Team Lead',
        location: 'San Francisco, CA (Hybrid)',
        startDate: '2022-03',
        endDate: 'Present',
        isCurrent: true,
        bullets: [
          'Architected and delivered high-throughput analytics pipeline processing 40M+ events/day using React, TypeScript, Node.js, Kafka, and PostgreSQL, reducing latency by 45%.',
          'Spearheaded transition from legacy monolith to Next.js micro-frontends with server-side rendering, boosting Lighthouse performance scores from 58 to 96.',
          'Mentored 6 engineers across frontend and backend disciplines, conducted rigorous code reviews, and instituted automated CI/CD workflows cutting release cycle from 2 weeks to daily.'
        ],
        techStack: ['React', 'TypeScript', 'Node.js', 'Kafka', 'PostgreSQL', 'Docker', 'GCP Cloud Run']
      },
      {
        id: 'exp-2',
        company: 'Apex Media & Commerce',
        role: 'Full-Stack Software Engineer',
        location: 'Austin, TX (Remote)',
        startDate: '2019-06',
        endDate: '2022-02',
        isCurrent: false,
        bullets: [
          'Built responsive checkout and subscription billing service integrating Stripe APIs and webhook handlers, increasing conversion rate by 18% across 450k active customers.',
          'Engineered real-time inventory synchronization service with Redis pub/sub and WebSockets, cutting race conditions and overselling incidents to zero.',
          'Developed comprehensive unit and integration testing suite with Jest and Cypress, achieving 88% test coverage and reducing production defects by 35%.'
        ],
        techStack: ['TypeScript', 'React', 'Node.js', 'Stripe API', 'Redis', 'PostgreSQL', 'AWS Lambda']
      },
      {
        id: 'exp-3',
        company: 'Beacon Interactive Labs',
        role: 'Frontend / Junior Web Developer',
        location: 'Seattle, WA',
        startDate: '2017-08',
        endDate: '2019-05',
        isCurrent: false,
        bullets: [
          'Implemented responsive UI dashboards and interactive charting components using React and D3.js for B2B enterprise clients.',
          'Refactored frontend CSS styling to reusable modular components, reducing bundle size by 30% and speeding initial load times.'
        ],
        techStack: ['JavaScript', 'React', 'CSS3 / SASS', 'REST APIs', 'Webpack']
      }
    ],
    education: [
      {
        id: 'edu-1',
        degree: 'Bachelor of Science in Computer Science',
        institution: 'University of Washington',
        location: 'Seattle, WA',
        graduationYear: '2017',
        details: 'Dean’s List, Focus on Distributed Systems & Human-Computer Interaction'
      }
    ],
    projects: [
      {
        id: 'proj-1',
        name: 'OmniStream - Realtime Analytics Engine',
        description: 'Open-source distributed telemetry collector with WebAssembly dashboard rendering 100k data points at 60fps.',
        link: 'https://github.com/alexmorgan-dev/omnistream',
        techStack: ['TypeScript', 'Rust / Wasm', 'React', 'WebSockets', 'Tailwind']
      },
      {
        id: 'proj-2',
        name: 'AutoDeploy CLI & GitHub Action',
        description: 'Developer productivity tool automating preview environment spins on Cloud Run for every PR.',
        link: 'https://github.com/alexmorgan-dev/autodeploy-cli',
        techStack: ['Node.js', 'Go', 'Docker', 'GitHub Actions']
      }
    ],
    certifications: [
      'AWS Certified Solutions Architect - Associate',
      'Google Cloud Certified Professional Cloud Developer'
    ],
    createdAt: '2026-01-15T09:00:00.000Z',
    updatedAt: '2026-08-25T14:30:00.000Z'
  },
  {
    id: 'cv-frontend-product',
    title: 'Frontend & Product Engineer (UI/UX Focus)',
    targetRole: 'Senior Frontend Engineer / Product Engineer',
    fullName: 'Alex Morgan',
    email: 'alex.morgan.dev@gmail.com',
    phone: '+1 (555) 382-9104',
    location: 'San Francisco, CA (Open to Remote)',
    linkedin: 'https://linkedin.com/in/alex-morgan-tech',
    github: 'https://github.com/alexmorgan-dev',
    portfolio: 'https://alexmorgan.io',
    summary: 'Design-minded Senior Frontend & Product Engineer passionate about building delightful, pixel-perfect user experiences with high performance and accessibility (WCAG AAA). Deep mastery of React, TypeScript, Next.js, motion systems, and scalable design systems collaborating closely with Product Designers and Founders.',
    isDefault: false,
    skills: [
      {
        category: 'Frontend Core',
        items: ['React 18/19', 'TypeScript', 'Next.js App Router', 'Tailwind CSS', 'Framer Motion', 'Radix UI / Headless UI', 'State Management (Zustand, Jotai)', 'TanStack Query']
      },
      {
        category: 'Design & DX',
        items: ['Figma to Code', 'Design System Architecture', 'Micro-interactions', 'WCAG AA/AAA Accessibility', 'Storybook', 'Responsive Layouts']
      },
      {
        category: 'Performance & Testing',
        items: ['Core Web Vitals', 'Lighthouse Optimization', 'Bundle Splitting', 'Vitest', 'Playwright E2E', 'Performance Profiling']
      }
    ],
    experience: [
      {
        id: 'fe-exp-1',
        company: 'Vanguard Cloud Solutions',
        role: 'Staff Frontend & Design Systems Engineer',
        location: 'San Francisco, CA',
        startDate: '2022-03',
        endDate: 'Present',
        isCurrent: true,
        bullets: [
          'Built the company-wide design system used across 14 internal and customer-facing apps, reducing UI bug tickets by 60% and cutting new feature development time in half.',
          'Spearheaded frontend overhaul of core SaaS workspace, optimizing rendering performance to sustain 60fps animations and sub-100ms interaction latency.',
          'Partnered directly with Product & UX leadership to establish design tokens, accessible keyboard navigation patterns, and fluid mobile-responsive breakpoints.'
        ],
        techStack: ['React', 'TypeScript', 'Tailwind CSS', 'Framer Motion', 'Storybook', 'Next.js']
      }
    ],
    education: [
      {
        id: 'fe-edu-1',
        degree: 'B.S. in Computer Science',
        institution: 'University of Washington',
        graduationYear: '2017'
      }
    ],
    projects: [
      {
        id: 'fe-proj-1',
        name: 'FluidUI - Zero-Runtime Headless Component Kit',
        description: 'Accessible, unstyled component primitives with built-in spring physics and focus trapping.',
        techStack: ['TypeScript', 'React', 'Tailwind']
      }
    ],
    certifications: [],
    createdAt: '2026-02-10T11:00:00.000Z',
    updatedAt: '2026-08-20T10:15:00.000Z'
  },
  {
    id: 'cv-tech-lead',
    title: 'Engineering Manager & Tech Lead',
    targetRole: 'Engineering Manager / Lead Architect',
    fullName: 'Alex Morgan',
    email: 'alex.morgan.dev@gmail.com',
    phone: '+1 (555) 382-9104',
    location: 'San Francisco, CA (Open to Remote)',
    linkedin: 'https://linkedin.com/in/alex-morgan-tech',
    github: 'https://github.com/alexmorgan-dev',
    summary: 'Strategic Engineering Lead and hands-on Architect with 7+ years guiding high-performing cross-functional teams to build resilient enterprise software. Adept at technical roadmap planning, developer mentorship, hiring top engineering talent, and balancing product velocity with architectural excellence.',
    isDefault: false,
    skills: [
      {
        category: 'Leadership & Management',
        items: ['Team Leadership (6-12 Engineers)', '1:1 Coaching & Career Growth', 'Technical Roadmap Planning', 'Agile / Scrum / Kanban', 'Hiring & Technical Interviewing', 'Cross-functional Alignment']
      },
      {
        category: 'System Architecture',
        items: ['Distributed Systems', 'Cloud Native (AWS/GCP)', 'API Gateway Architecture', 'Zero-Downtime Deployments', 'Disaster Recovery & SLOs']
      }
    ],
    experience: [
      {
        id: 'lead-exp-1',
        company: 'Vanguard Cloud Solutions',
        role: 'Engineering Lead / Manager',
        location: 'San Francisco, CA',
        startDate: '2023-01',
        endDate: 'Present',
        isCurrent: true,
        bullets: [
          'Led an engineering squad of 8 senior full-stack developers responsible for the core cloud orchestration engine generating $12M ARR.',
          'Established quarterly engineering OKRs, reduced sprint spillover by 30%, and improved sprint velocity by 25% through refined backlog grooming.',
          'Scaled team through active technical interviewing and onboarding 5 high-caliber engineers while maintaining 100% team retention.'
        ],
        techStack: ['Architecture Strategy', 'Team Coaching', 'TypeScript', 'Go', 'GCP', 'PostgreSQL']
      }
    ],
    education: [
      {
        id: 'lead-edu-1',
        degree: 'B.S. in Computer Science',
        institution: 'University of Washington',
        graduationYear: '2017'
      }
    ],
    certifications: ['Scrum Alliance Certified ScrumMaster (CSM)'],
    createdAt: '2026-03-01T14:00:00.000Z',
    updatedAt: '2026-08-15T16:45:00.000Z'
  }
];
