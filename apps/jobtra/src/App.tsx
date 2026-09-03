import React, { useState, useEffect, useMemo } from 'react';
import { ApplicationStatus, BaseCV, ConnectedAccount, EmailScanResult, JobApplication, JobSource, PriorityLevel } from './types';
import { INITIAL_APPLICATIONS, INITIAL_CONNECTED_ACCOUNTS, INITIAL_BASE_CVS, DEMO_INCOMING_EMAILS } from './data/initialData';
import { NotionTopNav } from './components/NotionTopNav';
import { NotionHeader } from './components/NotionHeader';
import { NotionViewTabs, ViewType } from './components/NotionViewTabs';
import { BoardView } from './components/BoardView';
import { TableView } from './components/TableView';
import { CalendarView } from './components/CalendarView';
import { EmailSyncHub } from './components/EmailSyncHub';
import { AnalyticsView } from './components/AnalyticsView';
import { CVVaultView } from './components/CVVaultView';
import { NotionSidePeek } from './components/NotionSidePeek';
import { NewApplicationModal } from './components/NewApplicationModal';
import { AccessCodeAuth, ACCESS_AUTH_STORAGE_KEY } from './components/AccessCodeAuth';
import { triggerOfferConfetti } from './utils/notionStyles';
import {
  saveApplicationToFirestore,
  deleteApplicationFromFirestore,
  saveAllApplicationsToFirestore,
  saveConnectedAccountToFirestore,
  deleteConnectedAccountFromFirestore,
  saveBaseCVToFirestore,
  deleteBaseCVFromFirestore,
  subscribeToApplications,
  subscribeToConnectedAccounts,
  subscribeToBaseCVs,
  testFirestoreConnection,
  purgeLegacyDemoData,
  clearAllApplicationsFromFirestore,
  onCloudProblem,
  supabase,
} from './lib/cloud';

const STORAGE_KEY = 'notion_job_tracker_apps_v2';
const EMAIL_QUEUE_KEY = 'notion_job_tracker_emails_v2';
const ACCOUNTS_STORAGE_KEY = 'notion_job_tracker_accounts_v2';
const CVS_STORAGE_KEY = 'notion_job_tracker_cvs_v2';

/**
 * A unique id, not a timestamp.
 *
 * Ids were `app-${Date.now()}`, and rows are written with UPSERT — so two
 * applications created in the same millisecond shared an id and the second
 * silently OVERWROTE the first. The email sync creates several in one pass,
 * which is exactly the shape that collides; the stored data still carries ids a
 * millisecond apart from it. randomUUID has no such window. The `app-` prefix
 * stays so old and new ids read alike.
 */
const newAppId = (): string => {
  const rand = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return `app-${rand}`;
};

export default function App() {
  // Applications state
  const [applications, setApplications] = useState<JobApplication[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Could not read from localStorage:', e);
    }
    return INITIAL_APPLICATIONS;
  });

  // Base CVs / Resumes state (multi-CV for different roles)
  const [baseCvs, setBaseCvs] = useState<BaseCV[]>(() => {
    try {
      const saved = localStorage.getItem(CVS_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Could not read CVs from localStorage:', e);
    }
    return INITIAL_BASE_CVS;
  });

  // Connected email accounts state (multi-account)
  const [connectedAccounts, setConnectedAccounts] = useState<ConnectedAccount[]>(() => {
    try {
      const saved = localStorage.getItem(ACCOUNTS_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Could not read accounts from localStorage:', e);
    }
    return INITIAL_CONNECTED_ACCOUNTS;
  });

  // Incoming scanned emails queue
  const [incomingEmails, setIncomingEmails] = useState<EmailScanResult[]>(() => {
    try {
      const saved = localStorage.getItem(EMAIL_QUEUE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Could not read email queue:', e);
    }
    return DEMO_INCOMING_EMAILS;
  });

  // Cloud status
  const [isFirebaseConnected, setIsFirebaseConnected] = useState(true);

  // Workspace gate. The real lock is the owner's Supabase session (the access
  // code is exchanged for it server-side); the storage flag only remembers that
  // this device unlocked before, so the gate doesn't flash while the session
  // is being read back from storage.
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      return (
        localStorage.getItem(ACCESS_AUTH_STORAGE_KEY) === 'true' ||
        sessionStorage.getItem(ACCESS_AUTH_STORAGE_KEY) === 'true'
      );
    } catch {
      return false;
    }
  });
  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(({ data }) => {
      if (alive && !data.session) setIsAuthenticated(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) setIsAuthenticated(false);
    });
    return () => { alive = false; sub.subscription.unsubscribe(); };
  }, []);

  const handleLockWorkspace = () => {
    try {
      localStorage.removeItem(ACCESS_AUTH_STORAGE_KEY);
      sessionStorage.removeItem(ACCESS_AUTH_STORAGE_KEY);
    } catch {
      /* storage unavailable (private mode) — the sign-out below still applies */
    }
    void supabase.auth.signOut();
    setIsAuthenticated(false);
  };

  // Active view
  const [currentView, setCurrentView] = useState<ViewType>('board');
  const [selectedApplication, setSelectedApplication] = useState<JobApplication | null>(null);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isStarred, setIsStarred] = useState(false);

  /**
   * What the app is allowed to tell you.
   *
   * Every failure path here used to end in console.warn: a save that failed, a
   * load that returned nothing because the request errored, an add that was
   * silently treated as a duplicate. All of them looked identical from the
   * outside — the row was simply not there. This is the one channel that says
   * why, and it is deliberately shown for successes-with-a-catch too ("already
   * tracking this one"), because those are the cases people report as bugs.
   */
  const [notice, setNotice] = useState<{ kind: 'error' | 'info'; text: string } | null>(null);
  const say = (kind: 'error' | 'info', text: string) => {
    setNotice({ kind, text });
    // Errors stay until dismissed; an informational note gets out of the way.
    if (kind === 'info') window.setTimeout(() => setNotice((n) => (n && n.text === text ? null : n)), 5000);
  };

  // Storage failures reach the UI instead of the console (see cloud.ts).
  useEffect(() => onCloudProblem(({ op, what, message }) => {
    const verb = op === 'save' ? 'save' : op === 'delete' ? 'delete' : 'load';
    say('error', `Couldn't ${verb} your ${what}: ${message}. Nothing was lost locally — check your connection and try again.`);
  }), []);

  // Filters and sorting
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | 'All'>('All');
  const [sourceFilter, setSourceFilter] = useState<JobSource | 'All'>('All');
  const [priorityFilter, setPriorityFilter] = useState<PriorityLevel | 'All'>('All');
  const [sortBy, setSortBy] = useState<'dateApplied' | 'company' | 'priority' | 'nextStep'>('dateApplied');

  // 1. Real-time synchronization for Applications, Accounts & Base CVs.
  //    Only once the workspace is unlocked: before that there is no session and
  //    every query would be refused (401) by row-level security.
  useEffect(() => {
    if (!isAuthenticated) return;
    let unsubscribeApps: () => void = () => {};
    let unsubscribeAccounts: () => void = () => {};
    let unsubscribeCVs: () => void = () => {};

    testFirestoreConnection().then((connected) => {
      setIsFirebaseConnected(connected);
      if (connected) {
        purgeLegacyDemoData().catch(() => {});
      }
    });

    try {
      unsubscribeApps = subscribeToApplications(
        (remoteApps) => {
          // Filter out legacy dummy apps if any are returned
          const filtered = (remoteApps || []).filter(
            (app) => !['app-1', 'app-2', 'app-3', 'app-4', 'app-5', 'app-6'].includes(app.id)
          );
          setApplications(filtered);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
        },
        (err) => console.warn('Firestore apps sync issue:', err)
      );

      unsubscribeAccounts = subscribeToConnectedAccounts(
        (remoteAccounts) => {
          const filtered = (remoteAccounts || []).filter(
            (acc) => !['acc-1', 'acc-2'].includes(acc.id)
          );
          // No dummy seed — accounts appear only after a real Gmail is connected
          // via OAuth (which writes the account row server-side).
          setConnectedAccounts(filtered);
          localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(filtered));
        },
        (err) => console.warn('Firestore accounts sync issue:', err)
      );

      unsubscribeCVs = subscribeToBaseCVs(
        (remoteCVs) => {
          if (remoteCVs && remoteCVs.length > 0) {
            setBaseCvs(remoteCVs);
            localStorage.setItem(CVS_STORAGE_KEY, JSON.stringify(remoteCVs));
          } else {
            // Seed initial base CVs into Firestore
            INITIAL_BASE_CVS.forEach((cv) => {
              saveBaseCVToFirestore(cv).catch((err) =>
                console.warn('Auto-seed base CV error:', err)
              );
            });
          }
        },
        (err) => console.warn('Firestore CVs sync issue:', err)
      );
    } catch (e) {
      console.warn('Could not initialize Firestore subscriptions:', e);
    }

    return () => {
      unsubscribeApps();
      unsubscribeAccounts();
      unsubscribeCVs();
    };
  }, [isAuthenticated]);

  // Local storage backup
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(applications));
    } catch (e) {
      console.warn('Failed to save to localStorage:', e);
    }
  }, [applications]);

  useEffect(() => {
    try {
      localStorage.setItem(CVS_STORAGE_KEY, JSON.stringify(baseCvs));
    } catch (e) {
      console.warn('Failed to save CVs to localStorage:', e);
    }
  }, [baseCvs]);

  useEffect(() => {
    try {
      localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(connectedAccounts));
    } catch (e) {
      console.warn('Failed to save accounts to localStorage:', e);
    }
  }, [connectedAccounts]);

  useEffect(() => {
    try {
      localStorage.setItem(EMAIL_QUEUE_KEY, JSON.stringify(incomingEmails));
    } catch (e) {
      console.warn('Failed to save email queue:', e);
    }
  }, [incomingEmails]);

  // CV Handlers
  const handleSaveCV = (cv: BaseCV) => {
    setBaseCvs((prev) => {
      const idx = prev.findIndex((c) => c.id === cv.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = cv;
        return next;
      }
      return [cv, ...prev];
    });
    saveBaseCVToFirestore(cv).catch((err) => console.warn('Firestore save CV error:', err));
  };

  const handleDeleteCV = (cvId: string) => {
    setBaseCvs((prev) => prev.filter((c) => c.id !== cvId));
    deleteBaseCVFromFirestore(cvId).catch((err) => console.warn('Firestore delete CV error:', err));
  };

  // Local storage backup
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(applications));
    } catch (e) {
      console.warn('Failed to save to localStorage:', e);
    }
  }, [applications]);

  useEffect(() => {
    try {
      localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(connectedAccounts));
    } catch (e) {
      console.warn('Failed to save accounts to localStorage:', e);
    }
  }, [connectedAccounts]);

  useEffect(() => {
    try {
      localStorage.setItem(EMAIL_QUEUE_KEY, JSON.stringify(incomingEmails));
    } catch (e) {
      console.warn('Failed to save email queue:', e);
    }
  }, [incomingEmails]);

  // Update status handler
  const handleUpdateStatus = (id: string, newStatus: ApplicationStatus) => {
    const target = applications.find((a) => a.id === id);
    if (!target) return;

    const updatedApp: JobApplication = {
      ...target,
      status: newStatus,
      updatedAt: new Date().toISOString(),
    };

    setApplications((prev) =>
      prev.map((app) => (app.id === id ? updatedApp : app))
    );

    if (selectedApplication && selectedApplication.id === id) {
      setSelectedApplication(updatedApp);
    }

    // Persist directly to Firebase Firestore
    saveApplicationToFirestore(updatedApp).catch((err) =>
      console.warn('Firestore status update error:', err)
    );
  };

  // Quick add from board column
  const handleQuickAdd = (status: ApplicationStatus, title: string) => {
    const parts = title.split(' - ');
    const company = parts[0]?.trim() || 'New Company';
    const role = parts[1]?.trim() || (parts[0]?.trim() ? `${parts[0].trim()} Role` : 'Target Position');

    const newApp: JobApplication = {
      id: newAppId(),
      company: company || 'New Company',
      role: role || 'Target Position',
      status,
      location: 'Remote',
      workType: 'Remote',
      source: 'Indeed',
      dateApplied: new Date().toISOString().split('T')[0],
      priority: 'Medium',
      notes: '',
      linkedEmails: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setApplications((prev) => [newApp, ...prev]);
    saveApplicationToFirestore(newApp).catch(() => {
      // Same rule as the modal add: if it did not store, it does not stay.
      setApplications((prev) => prev.filter((a) => a.id !== newApp.id));
    });
  };

  // Add full application from modal — with de-duplication so the same job isn't
  // tracked twice (same job URL, or same company + role). If it's already there,
  // open the existing one instead of creating a duplicate.
  const handleAddApplication = (newApp: JobApplication) => {
    const norm = (s?: string) => (s || '').trim().toLowerCase();
    const dup = applications.find((a) =>
      (!!newApp.jobUrl && norm(a.jobUrl) === norm(newApp.jobUrl)) ||
      (norm(a.company) !== '' && norm(a.company) === norm(newApp.company) && norm(a.role) === norm(newApp.role))
    );
    if (dup) {
      // SAY SO. This silently opened the existing record and dropped the new
      // one, which is indistinguishable from a failed save — and it fires on
      // company+role alone, so a second role at a company you already track
      // looked like the app refusing to save.
      setSelectedApplication(dup);
      say('info', `You're already tracking ${dup.role} at ${dup.company} — opened it instead of adding a duplicate.`);
      return;
    }
    setApplications((prev) => [newApp, ...prev]);
    saveApplicationToFirestore(newApp).catch(() => {
      // cloud.ts has already reported WHY. Take the card back off the board so
      // what is on screen matches what is stored — leaving it there is how a
      // failed save looked fine until the next refetch quietly removed it.
      setApplications((prev) => prev.filter((a) => a.id !== newApp.id));
    });
  };

  // Update existing application
  const handleUpdateApplication = (updated: JobApplication) => {
    setApplications((prev) =>
      prev.map((app) => (app.id === updated.id ? updated : app))
    );
    setSelectedApplication(updated);
    saveApplicationToFirestore(updated).catch((err) =>
      console.warn('Firestore update error:', err)
    );
  };

  // Delete application
  const handleDeleteApplication = (id: string) => {
    setApplications((prev) => prev.filter((app) => app.id !== id));
    if (selectedApplication && selectedApplication.id === id) {
      setSelectedApplication(null);
    }
    deleteApplicationFromFirestore(id).catch((err) =>
      console.warn('Firestore delete error:', err)
    );
  };

  // Connected accounts handlers
  const handleAddAccount = (account: ConnectedAccount) => {
    setConnectedAccounts((prev) => [account, ...prev]);
    saveConnectedAccountToFirestore(account).catch((err) =>
      console.warn('Firestore add account error:', err)
    );
  };

  const handleDeleteAccount = (accountId: string) => {
    setConnectedAccounts((prev) => prev.filter((a) => a.id !== accountId));
    deleteConnectedAccountFromFirestore(accountId).catch((err) =>
      console.warn('Firestore delete account error:', err)
    );
  };

  /**
   * Purge placeholder applications — the ones the importer invented.
   *
   * This deleted from the DATABASE, permanently, with no confirmation, anything
   * whose company was blank or matched a generic name. Two problems: a real
   * employer can legitimately be called "Company", and a real application you
   * had filled in by hand could still be sitting under a blank company — both
   * were destroyed on one click of a button whose natural use is "tidy up the
   * junk the AI made". Now it only takes rows with NOTHING of yours in them,
   * and it tells you exactly what it is about to remove.
   */
  const handlePurgeJunkApplications = () => {
    const junkCompNames = ['target company', 'helping hands', 'unknown', 'hiring organization', 'company'];
    // Anything you touched is not junk, whatever the company says.
    const hasYourWork = (app: JobApplication) =>
      !!(app.jobUrl || (app.notes || '').trim() || app.appliedCvId || app.contactName || app.contactEmail ||
        (app.linkedEmails && app.linkedEmails.length) || (app.interviewRounds && app.interviewRounds.length) ||
        app.nextStepDate || app.salary);

    const doomed = applications.filter((app) => {
      const compLower = (app.company || '').trim().toLowerCase();
      return (!compLower || junkCompNames.includes(compLower)) && !hasYourWork(app);
    });

    if (doomed.length === 0) {
      say('info', 'Nothing to clean up — no placeholder applications found.');
      return;
    }
    const list = doomed.slice(0, 8).map((a) => `• ${a.company || '(no company)'} — ${a.role || '(no role)'}`).join('\n');
    const more = doomed.length > 8 ? `\n…and ${doomed.length - 8} more` : '';
    if (!window.confirm(`Permanently delete ${doomed.length} placeholder application(s)?\n\n${list}${more}\n\nThis cannot be undone.`)) return;

    const junkIds: string[] = doomed.map((a) => a.id);
    setApplications((prev) => prev.filter((app) => !junkIds.includes(app.id)));
    junkIds.forEach((id) =>
      deleteApplicationFromFirestore(id).catch(() => { /* cloud.ts surfaces the reason */ })
    );
    say('info', `Removed ${junkIds.length} placeholder application(s).`);

    // Also clear incoming queue of dummy entries
    setIncomingEmails((prev) =>
      prev.filter((item) => {
        const compLower = (item.parsedData?.company || '').trim().toLowerCase();
        return !junkCompNames.includes(compLower);
      })
    );
  };

  // Apply parsed email update with rich online intelligence
  const handleApplyEmailUpdate = (emailResult: EmailScanResult) => {
    const { parsedData } = emailResult;
    const enrichment = parsedData.onlineEnrichment;

    const parsedComp = (parsedData.company || '').trim().toLowerCase();
    const isGenericCompany = !parsedComp || ['target company', 'company', 'unknown', 'hiring organization', 'helping hands'].includes(parsedComp);

    // Check if matched application exists (strict company comparison)
    const existingIndex = isGenericCompany
      ? -1
      : applications.findIndex((a) => {
          const aComp = (a.company || '').trim().toLowerCase();
          if (!aComp || ['target company', 'company', 'unknown', 'hiring organization', 'helping hands'].includes(aComp)) return false;
          return aComp === parsedComp;
        });

    const sourceKey = (parsedData.source.toLowerCase().includes('indeed')
      ? 'indeed'
      : parsedData.source.toLowerCase().includes('linkedin')
      ? 'linkedin'
      : parsedData.source.toLowerCase().includes('greenhouse')
      ? 'greenhouse'
      : parsedData.source.toLowerCase().includes('lever')
      ? 'lever'
      : parsedData.source.toLowerCase().includes('workday')
      ? 'workday'
      : parsedData.source.toLowerCase().includes('ashby')
      ? 'ashby'
      : 'direct') as any;

    const detectedStatus = (parsedData.detectedStatus || (parsedData as any).status || 'Applied') as ApplicationStatus;

    const newLinkedEmail = {
      id: emailResult.id,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      sender: emailResult.sender,
      subject: emailResult.subject,
      snippet: emailResult.snippet,
      fullBody: emailResult.fullBody,
      sourceType: sourceKey,
      detectedStatus: detectedStatus,
      aiSummary: parsedData.summary,
      actionRequired: parsedData.nextStep,
      extractedInterviewDate: parsedData.interviewDate,
    };

    if (existingIndex !== -1) {
      // Update existing application
      const existing = applications[existingIndex];
      const updated: JobApplication = {
        ...existing,
        status: detectedStatus || existing.status,
        salary: parsedData.salary || enrichment?.estimatedSalaryRange || existing.salary,
        location: parsedData.location || existing.location,
        workType: parsedData.workType || existing.workType,
        contactName: parsedData.recruiterName || existing.contactName,
        contactEmail: parsedData.recruiterEmail || existing.contactEmail,
        contactRole: parsedData.recruiterRole || existing.contactRole,
        contactLinkedin: parsedData.recruiterLinkedin || existing.contactLinkedin,
        companyWebsite: parsedData.companyWebsite || enrichment?.companyWebsite || existing.companyWebsite,
        companyCareersUrl: parsedData.companyCareersUrl || enrichment?.companyCareersUrl || existing.companyCareersUrl,
        jobUrl: parsedData.jobUrl || existing.jobUrl,
        nextStepTitle: parsedData.nextStep || existing.nextStepTitle,
        nextStepDate: parsedData.interviewDate || existing.nextStepDate,
        linkedEmails: [newLinkedEmail, ...(existing.linkedEmails || [])],
        updatedAt: new Date().toISOString(),
      };

      setApplications((prev) =>
        prev.map((a, idx) => (idx === existingIndex ? updated : a))
      );
      saveApplicationToFirestore(updated).catch((err) =>
        console.warn('Firestore update error:', err)
      );
    } else {
      // Create new application
      const newApp: JobApplication = {
        id: newAppId(),
        company: parsedData.company,
        role: parsedData.role || 'Position Applied',
        status: detectedStatus,
        salary: parsedData.salary || enrichment?.estimatedSalaryRange || '',
        location: parsedData.location || 'Remote',
        workType: parsedData.workType || 'Remote',
        source: parsedData.source || 'Indeed',
        contactName: parsedData.recruiterName,
        contactEmail: parsedData.recruiterEmail,
        contactRole: parsedData.recruiterRole,
        contactLinkedin: parsedData.recruiterLinkedin,
        companyWebsite: parsedData.companyWebsite || enrichment?.companyWebsite,
        companyCareersUrl: parsedData.companyCareersUrl || enrichment?.companyCareersUrl,
        jobUrl: parsedData.jobUrl,
        dateApplied: new Date().toISOString().split('T')[0],
        nextStepTitle: parsedData.nextStep,
        nextStepDate: parsedData.interviewDate,
        priority: 'High',
        notes: `Imported via Email Sync (${parsedData.source}).\n${parsedData.summary}${
          enrichment?.companyOverview ? `\n\nCompany Overview: ${enrichment.companyOverview}` : ''
        }`,
        linkedEmails: [newLinkedEmail],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setApplications((prev) => [newApp, ...prev]);
      saveApplicationToFirestore(newApp).catch(() => {
        setApplications((prev) => prev.filter((a) => a.id !== newApp.id));
      });
    }

    // Remove from incoming queue
    setIncomingEmails((prev) => prev.filter((e) => e.id !== emailResult.id));
  };

  // Dismiss incoming email
  const handleDismissEmail = (emailId: string) => {
    setIncomingEmails((prev) => prev.filter((e) => e.id !== emailId));
  };

  // Add new parsed email to queue
  const handleManualEmailParsed = (emailResult: EmailScanResult) => {
    setIncomingEmails((prev) => [emailResult, ...prev]);
  };

  // Accept all pending email updates
  const handleSyncAllPending = () => {
    incomingEmails.forEach((item) => handleApplyEmailUpdate(item));
    triggerOfferConfetti();
  };

  // Filter and sort applications
  const filteredApplications = useMemo(() => {
    return applications
      .filter((app) => {
        // Search filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          // Every field is coerced before .toLowerCase(). These were called
          // bare, so a single row missing `notes` (or company, location,
          // source) threw inside this useMemo the moment anyone typed in the
          // search box — which unmounts the board AND the table, i.e. every
          // application vanishes at once. The rows are clean today; that is not
          // a reason for one bad row to be able to take down the workspace.
          const hay = (v: unknown) => String(v ?? '').toLowerCase();
          const matches =
            hay(app.company).includes(q) ||
            hay(app.role).includes(q) ||
            hay(app.location).includes(q) ||
            hay(app.source).includes(q) ||
            hay(app.notes).includes(q) ||
            (Array.isArray(app.tags) && app.tags.some((t) => hay(t).includes(q)));
          if (!matches) return false;
        }

        // Status filter
        if (statusFilter !== 'All' && app.status !== statusFilter) return false;

        // Source filter
        if (sourceFilter !== 'All' && app.source !== sourceFilter) return false;

        // Priority filter
        if (priorityFilter !== 'All' && app.priority !== priorityFilter) return false;

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'company') {
          return a.company.localeCompare(b.company);
        } else if (sortBy === 'priority') {
          const pOrder = { High: 3, Medium: 2, Low: 1 };
          return pOrder[b.priority] - pOrder[a.priority];
        } else if (sortBy === 'nextStep') {
          return (b.nextStepDate || '').localeCompare(a.nextStepDate || '');
        } else {
          return (b.dateApplied || '').localeCompare(a.dateApplied || '');
        }
      });
  }, [applications, searchQuery, statusFilter, sourceFilter, priorityFilter, sortBy]);

  return (
    <div className="min-h-screen bg-white text-[#37352F] flex flex-col selection:bg-blue-100 selection:text-blue-900 font-sans">
      {/* The one place the app admits something went wrong. Errors persist until
          dismissed — a save failure that fades after three seconds is barely
          better than the console.warn it replaced. */}
      {notice && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] max-w-[min(38rem,92vw)] flex items-start gap-3 px-4 py-3 rounded-xl shadow-lg border text-xs ${
            notice.kind === 'error'
              ? 'bg-red-50 border-red-200 text-red-900'
              : 'bg-neutral-900 border-neutral-800 text-white'
          }`}
        >
          <span className="flex-1 leading-relaxed">{notice.text}</span>
          <button
            type="button"
            onClick={() => setNotice(null)}
            aria-label="Dismiss"
            className={`shrink-0 font-semibold px-1.5 rounded cursor-pointer ${
              notice.kind === 'error' ? 'hover:bg-red-100 text-red-700' : 'hover:bg-white/15 text-white/80'
            }`}
          >
            ✕
          </button>
        </div>
      )}

      {/* Sticky Notion Top Bar */}
      <NotionTopNav
        onOpenNewModal={() => setIsNewModalOpen(true)}
        onOpenEmailSync={() => setCurrentView('emails')}
        unreadEmailUpdatesCount={incomingEmails.length}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        isStarred={isStarred}
        onToggleStar={() => setIsStarred(!isStarred)}
        isFirebaseConnected={isFirebaseConnected}
        connectedAccountsCount={connectedAccounts.length}
        onLock={handleLockWorkspace}
      />

      {/* Notion Page Cover & Icon Header */}
      <NotionHeader
        applications={applications}
        onOpenEmailSync={() => setCurrentView('emails')}
        onOpenNewModal={() => setIsNewModalOpen(true)}
      />

      {/* Notion Database Views Tab Bar & Filters */}
      <NotionViewTabs
        currentView={currentView}
        onViewChange={setCurrentView}
        onOpenNewModal={() => setIsNewModalOpen(true)}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        sourceFilter={sourceFilter}
        onSourceFilterChange={setSourceFilter}
        priorityFilter={priorityFilter}
        onPriorityFilterChange={setPriorityFilter}
        sortBy={sortBy}
        onSortByChange={setSortBy}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        totalCount={filteredApplications.length}
        cvCount={baseCvs.length}
      />

      {/* Overdue follow-ups nudge — uses the nextStepDate you already track. */}
      {(() => {
        const todayStr = new Date().toISOString().slice(0, 10);
        const overdue = applications.filter(
          (a) => a.nextStepDate && a.nextStepDate < todayStr &&
            a.status !== 'Offer' && a.status !== 'Rejected' && a.status !== 'Withdrawn'
        );
        if (overdue.length === 0) return null;
        const names = overdue.slice(0, 4).map((a) => a.company).join(', ');
        return (
          <div className="px-4 sm:px-6 lg:px-8 pt-3">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              <span className="font-semibold">{overdue.length} follow-up{overdue.length > 1 ? 's' : ''} overdue</span>
              <span className="text-amber-700">— {names}{overdue.length > 4 ? ` +${overdue.length - 4} more` : ''}</span>
            </div>
          </div>
        );
      })()}

      {/* Main View Area */}
      <main className="flex-1 w-full pb-16">
        {currentView === 'board' && (
          <BoardView
            applications={filteredApplications}
            onSelectApplication={setSelectedApplication}
            onUpdateStatus={handleUpdateStatus}
            onQuickAdd={handleQuickAdd}
            onDeleteApplication={handleDeleteApplication}
          />
        )}

        {currentView === 'table' && (
          <TableView
            applications={filteredApplications}
            onSelectApplication={setSelectedApplication}
            onUpdateStatus={handleUpdateStatus}
            onDeleteApplication={handleDeleteApplication}
            onOpenNewModal={() => setIsNewModalOpen(true)}
          />
        )}

        {currentView === 'calendar' && (
          <CalendarView
            applications={filteredApplications}
            onSelectApplication={setSelectedApplication}
          />
        )}

        {currentView === 'emails' && (
          <EmailSyncHub
            applications={applications}
            incomingEmails={incomingEmails}
            connectedAccounts={connectedAccounts}
            onApplyEmailUpdate={handleApplyEmailUpdate}
            onDismissEmail={handleDismissEmail}
            onManualEmailParsed={handleManualEmailParsed}
            onSyncAllPending={handleSyncAllPending}
            onAddAccount={handleAddAccount}
            onDeleteAccount={handleDeleteAccount}
            onPurgeJunkApplications={handlePurgeJunkApplications}
            isFirebaseConnected={isFirebaseConnected}
          />
        )}

        {currentView === 'analytics' && (
          <AnalyticsView
            applications={applications}
            baseCvs={baseCvs}
            onSelectApplication={setSelectedApplication}
          />
        )}

        {currentView === 'cvs' && (
          <CVVaultView
            baseCvs={baseCvs}
            applications={applications}
            onSaveCV={handleSaveCV}
            onDeleteCV={handleDeleteCV}
            onOpenApplication={(app) => setSelectedApplication(app)}
          />
        )}
      </main>

      {/* Notion Side Peek Drawer / Modal */}
      {selectedApplication && (
        <NotionSidePeek
          application={selectedApplication}
          baseCvs={baseCvs}
          onClose={() => setSelectedApplication(null)}
          onUpdate={handleUpdateApplication}
          onDelete={handleDeleteApplication}
        />
      )}

      {/* New Application Creation Modal */}
      <NewApplicationModal
        isOpen={isNewModalOpen}
        baseCvs={baseCvs}
        onClose={() => setIsNewModalOpen(false)}
        onAdd={handleAddApplication}
      />

      {/* Access Code Passcode Lock Gate */}
      {!isAuthenticated && (
        <AccessCodeAuth onSuccess={() => setIsAuthenticated(true)} />
      )}
    </div>
  );
}
